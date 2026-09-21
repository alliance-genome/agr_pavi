#!/bin/bash
# PAVI EC2 Initial Setup Script
# Run this once after launching a new EC2 instance

set -e

echo "=== PAVI EC2 Setup ==="

# Update system
echo "Updating system packages..."
sudo yum update -y

# Install Docker
echo "Installing Docker..."
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
echo "Installing Nginx..."
sudo yum install -y nginx
sudo systemctl enable nginx

# Create PAVI directory
echo "Creating PAVI deployment directory..."
sudo mkdir -p /opt/pavi
sudo chown ec2-user:ec2-user /opt/pavi

# Copy files (assumes you've uploaded them)
echo "Setting up configuration files..."
if [ -f ./docker-compose.yml ]; then
    cp ./docker-compose.yml /opt/pavi/
fi
if [ -f ./deploy.sh ]; then
    cp ./deploy.sh /opt/pavi/
    chmod +x /opt/pavi/deploy.sh
fi
if [ -f ./nginx.conf ]; then
    sudo cp ./nginx.conf /etc/nginx/conf.d/pavi.conf
    sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
fi

# Test nginx config
echo "Testing Nginx configuration..."
sudo nginx -t

# Start nginx
echo "Starting Nginx..."
sudo systemctl start nginx

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Log out and back in (for docker group)"
echo "2. cd /opt/pavi"
echo "3. ./deploy.sh"
echo ""
echo "Or run: newgrp docker && cd /opt/pavi && ./deploy.sh"
