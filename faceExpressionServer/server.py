import cv2 as cv
import mediapipe as mp
import base64
import numpy as np
import csv
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from model import KeyPointClassifier
import main
import threading
from flask_cors import CORS

# Flask setup
app = Flask(__name__)

# Allow CORS
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Initializing
cap_device = 0
cap_width = 1920
cap_height = 1080

use_brect = True

# Camera preparation
cap = cv.VideoCapture(cap_device)
if not cap.isOpened():
    print("Error: Could not open video device.")
    exit()
cap.set(cv.CAP_PROP_FRAME_WIDTH, cap_width)
cap.set(cv.CAP_PROP_FRAME_HEIGHT, cap_height)

# Model load
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5)

keypoint_classifier = KeyPointClassifier()

# Read labels
with open('model/keypoint_classifier/keypoint_classifier_label.csv', encoding='utf-8-sig') as f:
    keypoint_classifier_labels = csv.reader(f)
    keypoint_classifier_labels = [row[0] for row in keypoint_classifier_labels]


@socketio.on('connect')
def handle_connect():
    print("Client connected")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


# Emit emotion ID and image frame as JSON to the front end
def emit_json_data(id, image):
    if id is not None and image is not None:
        # Convert the frame to base64
        _, buffer = cv.imencode('.jpg', image)
        img_str = base64.b64encode(buffer).decode('utf-8')

        # Create the JSON payload
        json_payload = {
            'emotion_id': int(id),
            'image': img_str
        }

        # Emit the JSON payload
        socketio.emit('emotion_data', json_payload)
    else:
        print("Warning: Skipped emitting data because ID or image is None.")


# Process frames and emit JSON data
def process_frames():
    try:
        while True:
            id, image = main.start(face_mesh, cap, keypoint_classifier, keypoint_classifier_labels, use_brect)
            if image is not None:
                emit_json_data(id, image)
            else:
                print("Warning: No frame captured or processed.")
            key = cv.waitKey(1)
            if key == 27:  # ESC key
                break
    except Exception as e:
        print(f"Error in process_frames: {e}")
    finally:
        cap.release()
        print("Video capture released")


@socketio.on('start_processing')
def start_processing():
    print("Started processing frames.")
    thread = threading.Thread(target=process_frames)
    thread.daemon = True
    thread.start()


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
