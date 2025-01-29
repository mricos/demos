ph-init(){
export PH_DIR=/var/www/phm
export PH_SRC=$PH_DIR/go
export PH_API=$PH_DIR/api
export PH_API_KEY=iamthat

sudo mkdir -p $PH_DIR/uploads
sudo chmod 755 $PH_DIR/uploads

sudo mkdir -p $PH_DIR $PH_SRC $PH_API

echo "Using:"
echo "  PH_SRC=$PH_SRC"
echo "  PH_DIR=$PH_DIR"
echo "  PH_API=$PH_API"
echo "  PH_API_KEY=$PH_API_KEY"
}

ph_create_systemd_service() {
    local service_file="/etc/systemd/system/ph-api.service"

    echo "Creating systemd service at $service_file"

    sudo tee "$service_file" > /dev/null <<EOF
[Unit]
Description=PH API Service
After=network.target

[Service]
ExecStart=/usr/local/go/bin/go run /var/www/html/go/main.go
WorkingDirectory=/var/www/html/go
Restart=always
User=www-data
Group=www-data
RuntimeDirectory=ph-api
Environment="PH_API_KEY=iamthat"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo chmod 644 "$service_file"
    sudo systemctl daemon-reload
    sudo systemctl enable ph-api
    sudo systemctl restart ph-api

    echo "ph-api systemd service created and started."
}

ph-restart(){
#!/bin/bash

echo "Restarting PH API service..."
sudo systemctl restart ph-api

echo "Restarting NGINX..."
sudo systemctl restart nginx

echo "Checking service status..."
sudo systemctl status ph-api --no-pager --lines=10

}

ph_logs() {
    echo "Showing live logs for ph-api.service..."
    sudo journalctl -u ph-api -f --no-pager
}
