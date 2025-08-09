from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

app = Flask(__name__)
CORS(app)

current_floor = 1
requests_queue = []
lock = threading.Lock()
emergency_mode = False
floor_time_log = {}

roles = {
    "admin": 3,      # high priority
    "vip": 2,
    "user": 1        # normal priority
}

def elevator_mover():
    global current_floor, requests_queue, emergency_mode
    while True:
        lock.acquire()
        if emergency_mode:
            print("EMERGENCY MODE ACTIVE - Stopping all movement")
            lock.release()
            time.sleep(1)
            continue

        if requests_queue:
            # Sort requests by priority (descending)
            requests_queue.sort(key=lambda x: x["priority"], reverse=True)
            next_request = requests_queue.pop(0)
            next_floor = next_request["floor"]
            lock.release()

            # Simulate elevator moving floor by floor
            while current_floor != next_floor:
                if current_floor < next_floor:
                    current_floor += 1
                    direction = "Up"
                elif current_floor > next_floor:
                    current_floor -= 1
                    direction = "Down"
                print(f"Elevator at floor {current_floor} going {direction}")
                time.sleep(2)  # Updated here: 2 seconds per floor

            print(f"Elevator reached floor {current_floor}")
            floor_time_log[current_floor] = time.time()
        else:
            lock.release()
            time.sleep(0.5)

threading.Thread(target=elevator_mover, daemon=True).start()

@app.route('/request', methods=['POST'])
def request_floor():
    global requests_queue
    data = request.get_json()
    floor = data.get('floor')
    role = data.get('role', 'user')

    with lock:
        if emergency_mode:
            return jsonify({"error": "System in emergency mode"}), 403

        if floor != current_floor:
            # avoid duplicate floor requests
            if not any(r["floor"] == floor for r in requests_queue):
                requests_queue.append({"floor": floor, "priority": roles.get(role, 1)})

        return jsonify({
            "current_floor": current_floor,
            "queue": [r["floor"] for r in requests_queue]
        })

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "current_floor": current_floor,
        "queue": [r["floor"] for r in requests_queue],
        "emergency": emergency_mode,
        "last_floor_time": floor_time_log.get(current_floor, None)
    })

@app.route('/emergency', methods=['POST'])
def toggle_emergency():
    global emergency_mode
    data = request.get_json()
    action = data.get("action")

    with lock:
        if action == "on":
            emergency_mode = True
            requests_queue.clear()
        elif action == "off":
            emergency_mode = False

    return jsonify({"emergency": emergency_mode})

if __name__ == "__main__":
    app.run(debug=True)
