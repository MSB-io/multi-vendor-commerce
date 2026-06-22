#!/bin/bash
set -e
cd /Users/manthan/Desktop/Devops
tar -czf /Users/manthan/Desktop/devops.tar.gz --exclude='.git' --exclude='node_modules' .
scp -i devops-key -o StrictHostKeyChecking=no /Users/manthan/Desktop/devops.tar.gz ec2-user@13.206.208.160:~/
ssh -i devops-key -o StrictHostKeyChecking=no ec2-user@13.206.208.160 'mkdir -p ~/Devops && tar -xzf devops.tar.gz -C ~/Devops'
TOKEN=$(aws ecr get-login-password --region ap-south-1)
ssh -i devops-key -o StrictHostKeyChecking=no ec2-user@13.206.208.160 "echo ${TOKEN} | docker login --username AWS --password-stdin 040066346143.dkr.ecr.ap-south-1.amazonaws.com && cd ~/Devops && docker build -t commerce-backend:latest -f docker/Dockerfile.backend . && docker tag commerce-backend:latest 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest && docker push 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest && docker build -t commerce-frontend:latest -f docker/Dockerfile.frontend . && docker tag commerce-frontend:latest 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest && docker push 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest"
