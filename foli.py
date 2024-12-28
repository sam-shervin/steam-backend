from flask import Flask, request, send_file
from flask_cors import CORS
import folium
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set up logging
logging.basicConfig(level=logging.DEBUG)

@app.before_request
def log_request_info():
    app.logger.debug('Headers: %s', request.headers)
    app.logger.debug('Body: %s', request.get_data())

@app.route('/generate-map', methods=['GET'])
def generate_map():
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')

    if not latitude or not longitude:
        return "Latitude and Longitude are required", 400

    try:
        location = [float(latitude), float(longitude)]
        m = folium.Map(location=location, zoom_start=12)

        folium.Marker(
            location=location,
            popup=f'Coordinates: {latitude}, {longitude}',
            icon=folium.Icon(color='red', icon='info-sign')
        ).add_to(m)

        # Save map to HTML file
        map_path = 'map.html'
        m.save(map_path)

        # Send the map HTML file as a response
        return send_file(map_path)
    except ValueError:
        return "Invalid coordinates", 400

if __name__ == '__main__':
    app.run(debug=True)