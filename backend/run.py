from app import create_app

app = create_app()

if __name__ == "__main__":
    # 0.0.0.0 makes the server reachable from other devices on the same wifi,
    # which is how the Expo app on a phone talks to it. Binding to 127.0.0.1
    # would limit it to this machine and every request from the phone would fail.
    app.run(host="0.0.0.0", port=5000, debug=True)
