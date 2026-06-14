# Multi-Vendor Commerce Platform - Deployment Guide

## Overview
This document outlines the step-by-step deployment process for the Multi-Vendor Commerce Platform, orchestrated by Jenkins and deployed to an Amazon EKS cluster.

## Deployment Pipeline (Jenkinsfile)

### Stage 1: Build & Unit Test
- The Jenkins pipeline triggers automatically on a GitHub webhook `push` event.
- It pulls the latest source code.
- Dependencies are installed using `npm ci`.
- Unit tests are executed.

### Stage 2: Docker Image Build
- Two separate Docker images are built: `frontend` and `backend`.
- The frontend image uses a multi-stage build: compiling the React app with Node.js and serving the static files via Nginx.
- The backend image packages the Express.js application.

### Stage 3: Push to Amazon ECR
- The Jenkins server authenticates with Amazon Elastic Container Registry (ECR) using an IAM Instance Profile.
- Both Docker images are tagged with the specific Git commit hash and pushed to their respective ECR repositories.

### Stage 4: Kubernetes Deployment (EKS)
- The pipeline updates the Kubernetes deployment YAML files with the newly built Docker image tags.
- It authenticates to the `commerce-cluster` EKS cluster.
- Uses `kubectl apply -f kubernetes/` to deploy the services.
- Kubernetes handles the Rolling Update strategy, spinning up the new pods before safely terminating the old ones to ensure zero downtime.

## Secrets and Variables
- **Vault**: Database passwords and API keys are stored securely in HashiCorp Vault. The application fetches these at runtime or they are injected via Kubernetes Secrets.
- **ConfigMaps**: Non-sensitive configuration (like the backend URL for the frontend) are mounted as ConfigMaps inside the pods.

## Scaling
- **Horizontal Pod Autoscaler (HPA)** is configured to scale the frontend and backend deployments between 1 and 5 replicas based on CPU utilization exceeding 70%.
