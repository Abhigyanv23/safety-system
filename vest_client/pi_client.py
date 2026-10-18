import os
import time
import threading
import requests
import socketio
import subprocess
import base64
from flask import Flask, request, jsonify
from gpiozero import OutputDevice
import board
import adafruit_dht
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

# Fetch the URL, with a fallback just in case the .env file is missing
LAPTOP_BACKEND_URL = os.getenv("LAPTOP_BACKEND_URL", "http://127.0.0.1:5001")
SNAPSHOT_PATH = os.path.expanduser("~/vest/alert_snapshot.jpg")

VEST_DIR = os.path.dirname(SNAPSHOT_PATH)
if not os.path.exists(VEST_DIR):
    os.makedirs(VEST_DIR, exist_ok=True)

app = Flask(__name__)
sio = socketio.Client()
motor_state = "OFF"
vibration_timer = None

try:
    dht_sensor = adafruit_dht.DHT11(board.D18, use_pulseio=False)
except Exception as e:
    print(f"Failed to initialize DHT11: {e}")
    dht_sensor = None

env_data = {
    "temperature": 29.3,
    "humidity": 74.0,
    "status": "MOCK_OFFLINE"
}

health_data = {
    "heartRate": 78,
    "spo2": 98,
    "status": "MOCK_OFFLINE"
}

try:
    vibration_motor = OutputDevice(23)
except Exception as e:
    print(f"GPIO Init Error: {e}")
    vibration_motor = None

def stop_vibration():
    global motor_state
    motor_state = "OFF"
    if vibration_motor:
        vibration_motor.off()
    print("Vibration Motor automatically stopped.")

@app.route('/helmet/event', methods=['POST'])
def helmet_event():
    event_data = request.json
    print(f"Helmet event received from ESP32: {event_data}")
    
    event_data["x"] = 15
    event_data["y"] = 25
    
    if event_data.get("event") in ["Fall Detected", "Impact Detected"]:
        try:
            subprocess.run(
                ["rpicam-still", "-o", SNAPSHOT_PATH, "--nopreview", "-t", "500", "--width", "640", "--height", "480"], 
                check=True
            )
            print("Alert snapshot captured successfully.")
            
            if os.path.exists(SNAPSHOT_PATH):
                with open(SNAPSHOT_PATH, "rb") as image_file:
                    base64_string = base64.b64encode(image_file.read()).decode('utf-8')
                    event_data["snapshot"] = f"data:image/jpeg;base64,{base64_string}"
            else:
                print("Snapshot file missing after capture command.")
                
        except FileNotFoundError:
            print("Camera capture failed: No such file or directory: 'rpicam-still'")
        except Exception as e:
            print(f"Camera error: {e}")

    try:
        requests.post(f"{LAPTOP_BACKEND_URL}/api/events", json=event_data, timeout=5)
    except requests.exceptions.RequestException as e:
        print(f"Failed to forward event to laptop: {e}")
        
    return jsonify({"status": "forwarded"}), 200

@sio.event
def connect():
    print("Connected to Laptop Backend via Socket.IO")

@sio.on('vibration_command')
def on_vibration(data):
    global motor_state, vibration_timer
    if data.get("workerId") == "W01":
        command = data.get("command")
        if command in ["ON", "START"]:
            motor_state = "ON"
            print("Vibration Motor started for 30 seconds.")
            if vibration_motor:
                vibration_motor.on()
            if vibration_timer:
                vibration_timer.cancel()
            vibration_timer = threading.Timer(30.0, stop_vibration)
            vibration_timer.start()
        elif command in ["OFF", "STOP"]:
            if vibration_timer:
                vibration_timer.cancel()
            stop_vibration()

def connect_socket():
    try:
        sio.connect(LAPTOP_BACKEND_URL)
    except Exception as e:
        print("Socket connection failed: ", e)

def dht_poller():
    global env_data
    while True:
        if dht_sensor:
            try:
                temperature = dht_sensor.temperature
                humidity = dht_sensor.humidity
                
                if temperature is not None and humidity is not None:
                    env_data = {
                        "temperature": round(temperature, 1),
                        "humidity": round(humidity, 1),
                        "status": "LIVE"
                    }
                    print(f"DHT11 Reading: Temp: {temperature}C, Humidity: {humidity}%")
                    time.sleep(240)
                    continue
                    
            except RuntimeError:
                time.sleep(2)
                continue
            except Exception as error:
                print(f"DHT11 Fatal Error: {error}")
        
        env_data["status"] = "MOCK_OFFLINE"
        time.sleep(240)

def max30102_poller():
    global health_data
    try:
        import max30102
        import hrcalc
        sensor = max30102.MAX30102()
        print("MAX30102 sensor initialized successfully.")
        
        while True:
            try:
                red, ir = sensor.read_sequential()
                
                if len(red) > 0 and len(ir) > 0:
                    avg_ir = sum(ir) / len(ir)
                    
                    if avg_ir < 50000:
                        health_data["status"] = "FINGER_REMOVED"
                        time.sleep(1)
                        continue

                    hr, hr_valid, spo2, spo2_valid = hrcalc.calc_hr_and_spo2(ir, red)
                    
                    if hr_valid and spo2_valid:
                        health_data = {
                            "heartRate": int(hr),
                            "spo2": int(spo2),
                            "status": "LIVE"
                        }
                        print(f"Vitals Updated - HR: {int(hr)} bpm | SpO2: {int(spo2)}%")
                    
            except Exception as e:
                print(f"MAX30102 Read Error: {e}")
                time.sleep(2)
                
    except ImportError:
        print("MAX30102 or hrcalc library not found in directory.")
    except Exception as e:
        print(f"MAX30102 Init Error: {e}")

def telemetry_loop():
    connect_socket()
    while True:
        payload = {
            "workerId": "W01",
            "x": 15,
            "y": 25,
            "health": health_data,
            "environment": env_data,
            "safety": { "systemStatus": "SAFE", "vibrationMotor": motor_state },
            "camera": { "status": "ONLINE", "lastSnapshot": None }
        }
        
        try:
            requests.post(f"{LAPTOP_BACKEND_URL}/api/telemetry", json=payload, timeout=3)
        except requests.exceptions.RequestException:
            pass
            
        time.sleep(2)

if __name__ == "__main__":
    threading.Thread(target=dht_poller, daemon=True).start()
    threading.Thread(target=max30102_poller, daemon=True).start()
    threading.Thread(target=telemetry_loop, daemon=True).start()
    
    app.run(host="0.0.0.0", port=5000, use_reloader=False)
