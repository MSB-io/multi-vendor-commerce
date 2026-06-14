# Multi-Vendor Commerce Platform - Final Documentation

## Project Overview
This project satisfies the requirements for **Case Study 5: Multi-Vendor Commerce Platform**. We built a cloud-native, microservices-based web application mimicking a vendor marketplace, and wrapped it in a complete, automated DevOps lifecycle using industry-standard tools within the constraints of the AWS Free Tier.

## Delivered Artifacts
| Requirement | Implementation |
|---|---|
| **Working Application** | React JS frontend and Node.js/Express backend communicating via REST API. |
| **Source Code Repository** | Hosted on GitHub (`MSB-io/multi-vendor-commerce`). |
| **Dockerfiles & Images** | Multi-stage Dockerfiles. Images hosted securely on Amazon Elastic Container Registry (ECR). |
| **Jenkins CI/CD** | Jenkinsfile defining a declarative pipeline for automated builds, testing, and Kubernetes deployment. |
| **Terraform Scripts** | Infrastructure as Code (IaC) provisioning the VPC, subnets, EC2 instances, EKS cluster, and RDS database. |
| **Kubernetes YAMLs** | Deployments, Services, ConfigMaps, and HPA (Horizontal Pod Autoscalers) ensuring high availability. |
| **Monitoring** | Grafana dashboard provisioned to visualize CPU and Memory metrics for the EKS nodes and pods. |
| **Logging** | ELK Stack (Elasticsearch & Kibana) deployed for centralized log aggregation. |
| **Secret Management** | HashiCorp Vault implementation securely injecting database credentials without exposing them in plaintext. |

## Technical Highlights & Problem Solving
During the deployment phase, we encountered strict AWS Free Tier constraints that required architectural pivots:
1. **IP Address Exhaustion (ENI Limits)**: The `t3.micro` EC2 instances used for the EKS nodes hit their Elastic Network Interface IP limits, causing a scheduling deadlock during a rolling deployment. We resolved this by explicitly scaling the deployments to zero to free the IP pool before scaling back to the desired replica count.
2. **EBS Storage Limits**: The ELK Stack Docker images exceeded the default 8GB root volume size of the EC2 instances. We dynamically resized the EBS volume to 20GB and performed a live filesystem expansion (`xfs_growfs`) to accommodate the containers without incurring out-of-pocket billing.

## Conclusion
This project successfully demonstrates the end-to-end automation of a software development lifecycle. By utilizing Terraform for infrastructure, Jenkins for CI/CD, Kubernetes for orchestration, and Vault for security, the Multi-Vendor Commerce platform is highly scalable, resilient, and production-ready.
