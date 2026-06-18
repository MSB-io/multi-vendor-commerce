# Multi-Vendor Commerce Platform - Detailed Documentation

This documentation provides a comprehensive technical overview of the Multi-Vendor Commerce Platform, its architecture, cloud infrastructure, containerization setup, CI/CD pipeline, and application development workflows.

---

## 1. System Architecture

The application is built using a cloud-native, microservices-based architecture designed to deploy seamlessly onto Amazon Web Services (AWS) using industry-standard DevOps tools. 

### Infrastructure & Deployments Overview
```mermaid
graph TD
    subgraph "AWS Cloud (ap-south-1)"
        subgraph "Public Subnet"
            IGW[Internet Gateway]
            Jenkins[Jenkins CI/CD Server<br>t3.micro]
            Vault[HashiCorp Vault Server<br>t3.micro]
            ALB[Application Load Balancer]
        end

        subgraph "Private Subnet"
            subgraph "EKS Cluster (commerce-cluster)"
                Frontend[React Frontend Pods<br>Nginx]
                Backend[Node.js Backend Pods<br>Express API]
            end
            
            RDS[(Amazon RDS<br>PostgreSQL)]
        end
        
        ECR[Amazon ECR<br>Docker Registries]
    end

    User((User/Browser)) --> |HTTP/HTTPS| ALB
    ALB --> |Port 80| Frontend
    Frontend --> |/api/| Backend
    Backend --> |TCP 5432| RDS
    
    Jenkins --> |Docker Push| ECR
    Jenkins --> |kubectl apply| EKS
    
    Developer((Developer)) --> |Git Push| GitHub[GitHub Repo]
    GitHub --> |Webhook trigger| Jenkins
```

### Flow of Interactions
1. **User Request**: Users access the platform via their browser. The request hits the AWS Application Load Balancer (ALB).
2. **Frontend Routing**: The ALB forwards traffic to the static assets served by the Nginx container inside the **React Frontend Pods**.
3. **API Requests**: Any client-side dynamic request prefixed with `/api/` is proxied by Nginx directly to the **Node.js Express Backend Pods**.
4. **Data Management**: The backend performs application business logic and interacts with the **Amazon RDS PostgreSQL** instance to fetch or mutate data.
5. **Continuous Deployment**: When developers push commits, GitHub webhooks trigger the Jenkins server to build Docker images, push them to Amazon ECR, and execute Kubernetes rollouts.
6. **Secrets injection**: Database credentials and sensitive API tokens are managed via HashiCorp Vault.

---

## 2. Repository Directory Layout

Below is the directory structure of the project with a high-level description of each module:

```text
multi-vendor-commerce/
├── README.md                                # General project summary & technical highlights
├── docker-compose.yaml                      # Multi-container local developer orchestration
├── app/                                     # Core Application Source Code
│   ├── backend/                             # Express REST API
│   │   ├── config/                          # Configuration modules (db connection, etc.)
│   │   ├── db/                              # Database schemas and initialization seeds
│   │   ├── middleware/                      # Express middleware (auth and role validation)
│   │   ├── routes/                          # API endpoints categorized by resources
│   │   ├── server.js                        # App entry point, logging, error handlers
│   │   └── package.json                     # Backend dependencies & run scripts
│   └── frontend/                            # React JS client application (Vite-driven)
│       ├── src/                             # React source code
│       │   ├── api/                         # Axios API handlers with JWT injection
│       │   ├── components/                  # Common components (Navbar, Product Cards)
│       │   ├── context/                     # Global state providers (Authentication, Cart)
│       │   ├── lib/                         # Utility functions (Shadcn styling helpers)
│       │   ├── pages/                       # Page templates (Home, Vendor Dashboard, etc.)
│       │   ├── App.jsx                      # App router and contexts wrapper
│       │   └── index.css                    # Modern CSS styling with Tailwind CSS and theme variables
│       └── package.json                     # Frontend dependencies & Vite setup
├── docker/                                  # Dockerfiles & deployment configurations
│   ├── Dockerfile.backend                   # Node.js production image build file
│   ├── Dockerfile.frontend                  # Multi-stage production React/Nginx build file
│   ├── docker-compose.monitoring.yml        # ELK + Grafana developer configuration
│   └── nginx.conf                           # Frontend Nginx routing & API proxy configuration
├── docs/                                    # Existing architecture and recovery procedures
│   ├── ARCHITECTURE.md                      # Architecture diagram and component breakdown
│   ├── DEPLOYMENT.md                        # Deployment pipeline stages
│   └── DISASTER_RECOVERY.md                 # Recovery strategies (DB failure, EKS region outage, etc.)
├── jenkins/                                 # CI/CD definitions
│   └── Jenkinsfile                          # Pipeline definition file
├── kubernetes/                              # Kubernetes manifests
│   ├── backend-deployment.yaml              # Backend Deployment configuration
│   ├── frontend-deployment.yaml             # Frontend Deployment configuration
│   ├── db-secret.yaml                       # Database connection parameters (templated)
│   ├── hpa.yaml                             # Autoscaling metrics configuration
│   └── services.yaml                        # NodePorts and LoadBalancers definition
└── terraform/                               # Infrastructure as Code
    ├── main.tf                              # Provider declarations
    ├── variables.tf                         # Input variables
    ├── network.tf                           # VPC & security groups definitions
    ├── ec2.tf                               # EC2 definition for Jenkins & Vault
    ├── ecr.tf                               # ECR repos definition
    ├── rds.tf                               # PostgreSQL Database instance definition
    └── eks.tf                               # Managed Kubernetes node groups
```

---

## 3. Subsystem Analysis & Detailed Breakdowns

### 3.1 Backend Application (`app/backend`)

The backend is built with **Node.js** and **Express.js**, running a stateless API that hooks up to the PostgreSQL database.

*   **Entry Point**: The application starts through [server.js](file:///Users/manthan/Desktop/Devops/app/backend/server.js). It registers base middleware like JSON parsing, CORS, HTTP request logging ([morgan](https://github.com/expressjs/morgan) combined logs, which is parsed by ELK), exposes the `/health` liveness/readiness probe, maps resource routers, and registers global 404 and unhandled exception handlers.
*   **Database Client**: Connected using `pg`'s database pool in [config/db.js](file:///Users/manthan/Desktop/Devops/app/backend/config/db.js). It enables SSL reject-unauthorized avoidance in production to work seamlessly with RDS certificates.
*   **Authentication & Authorization**:
    *   Auth middleware in [middleware/auth.js](file:///Users/manthan/Desktop/Devops/app/backend/middleware/auth.js) validates the `Authorization: Bearer <JWT>` header using the environment-defined `JWT_SECRET`.
    *   `vendorOnly` middleware restricts certain write actions to users whose database role is explicitly set to `vendor`.
*   **Routing Modules**:
    *   [routes/auth.js](file:///Users/manthan/Desktop/Devops/app/backend/routes/auth.js): Handles user registration and login. Passwords are encrypted using `bcryptjs`. Generates a JWT signed token upon authentication.
    *   [routes/products.js](file:///Users/manthan/Desktop/Devops/app/backend/routes/products.js): Exposes CRUD endpoints for product management. Public users can browse/search all products, while vendors can add new products and can update/delete only the products belonging to them (using user credentials decoded from the JWT token).
    *   [routes/orders.js](file:///Users/manthan/Desktop/Devops/app/backend/routes/orders.js): Handles purchase orchestration. Operates within SQL Transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) to enforce critical constraints: verifies that products exist, checks that inventory is sufficient, decrements item stock, creates the order, and saves the individual items.

### 3.2 Database Schema (`app/backend/db/schema.sql`)

The database is built on **PostgreSQL**. [schema.sql](file:///Users/manthan/Desktop/Devops/app/backend/db/schema.sql) structures the relational tables:
1.  `users`: Stores usernames, emails, roles (validated as `vendor` or `customer`), and password hashes.
2.  `products`: Stores items linked to `users.id` via foreign key `vendor_id` (cascades on delete).
3.  `orders`: Tracks total amount and status (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`).
4.  `order_items`: Maps a list of products and pricing items directly onto their parent order.
5.  **Data Seeding**: Automatically seeds three baseline accounts (two vendors: *TechMart Store*, *Fashion Hub*; and one customer: *Demo Customer*) along with six products for testing. The default password for all seeded users is `"password"`.

### 3.3 Frontend Application (`app/frontend`)

A modern single page application (SPA) built using **React 19**, **Vite 8**, and **Tailwind CSS v4**.

*   **Setup and Styling**: Styled with a design system implemented in [index.css](file:///Users/manthan/Desktop/Devops/app/frontend/src/index.css), applying custom `oklch` palette variables (background, foreground, primary/secondary colors, border configurations, etc.) alongside standard fonts like *Geist*.
*   **Routing**: Defined in [App.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/App.jsx) using `react-router-dom`. Routes are wrapped in the global Auth and Cart providers.
*   **State Providers**:
    *   [context/AuthContext.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/context/AuthContext.jsx): Handles login/logout logic, persists the user session in `localStorage`, and exposes the current user's profile.
    *   [context/CartContext.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/context/CartContext.jsx): Stores local cart state, allowing customers to add/remove products, adjust quantities, calculate total pricing, and wipe state upon checking out.
*   **Networking Client**: [api/index.js](file:///Users/manthan/Desktop/Devops/app/frontend/src/api/index.js) initializes `axios` with a base URL of `/api` (proxied in production by Nginx) and dynamically hooks up a request interceptor to append JWT Bearer tokens to header keys when present.
*   **Pages & Core Components**:
    *   [pages/Home.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/pages/Home.jsx): The store front. Allows category filtering, searching, and displays products using [ProductCard.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/components/ProductCard.jsx).
    *   [pages/VendorDashboard.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/pages/VendorDashboard.jsx): Rich dashboard where vendors can view metrics (Total products, orders, and cumulative revenue in INR), manage their listing via CRUD forms, and track incoming orders.
    *   [pages/Checkout.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/pages/Checkout.jsx) and [pages/Orders.jsx](file:///Users/manthan/Desktop/Devops/app/frontend/src/pages/Orders.jsx): Allow customers to complete purchases and track orders.

---

## 4. Infrastructure as Code (Terraform)

The AWS cloud infrastructure is provisioned entirely using **Terraform** within the `/terraform` folder.

| Resource | Terraform File | Details |
|---|---|---|
| **VPC** | [network.tf](file:///Users/manthan/Desktop/Devops/terraform/network.tf) | Configures a VPC named `commerce-vpc` with CIDR `10.0.0.0/16`. Allocates public and private subnets across two Availability Zones (`ap-south-1a`, `ap-south-1b`). Configures a single NAT Gateway to route private outbound traffic. |
| **Security Group** | [network.tf](file:///Users/manthan/Desktop/Devops/terraform/network.tf) | Defines an `allow_all` SG allowing all incoming/outgoing traffic for easier ephemeral developer setup. |
| **Jenkins EC2** | [ec2.tf](file:///Users/manthan/Desktop/Devops/terraform/ec2.tf) | Provisions a `t3.micro` Amazon Linux 2023 instance in a public subnet for the CI/CD pipeline, equipped with an SSH key block and a public IP. |
| **Vault EC2** | [ec2.tf](file:///Users/manthan/Desktop/Devops/terraform/ec2.tf) | Provisions a `t3.micro` Amazon Linux 2023 instance in a public subnet for centralized Vault secret configuration. |
| **ECR Registries** | [ecr.tf](file:///Users/manthan/Desktop/Devops/terraform/ecr.tf) | Creates two private Docker repositories: `commerce-backend` and `commerce-frontend`. |
| **EKS Cluster** | [eks.tf](file:///Users/manthan/Desktop/Devops/terraform/eks.tf) | Configures the `commerce-cluster` using EKS version `1.30`. Deploys an EKS managed node group running on `t3.micro` instances. Auto-scaling is configured for `min=1`, `desired=2`, and `max=3`. |
| **RDS Instance** | [rds.tf](file:///Users/manthan/Desktop/Devops/terraform/rds.tf) | Provisions a `db.t3.micro` PostgreSQL 15 instance. It has 20GB of allocated storage, has `publicly_accessible` set to true, and resides in a subnet group associated with the public subnets to simplify external developer/debugging connectivity. |

> [!NOTE]
> There is a discrepancy between [docs/ARCHITECTURE.md](file:///Users/manthan/Desktop/Devops/docs/ARCHITECTURE.md) and [terraform/rds.tf](file:///Users/manthan/Desktop/Devops/terraform/rds.tf). The architecture diagram highlights RDS as residing in the private subnet. However, `rds.tf` maps the DB subnet group directly to public subnets (`module.vpc.public_subnets`) and specifies `publicly_accessible = true`. This is a classic development workaround to avoid VPN routing and allow direct developer tooling to inspect DB contents.

---

## 5. Docker & Local Development Setup

To replicate production locally or run integration tests, the platform is structured for direct container orchestration.

### 5.1 Dockerfiles
*   [Dockerfile.backend](file:///Users/manthan/Desktop/Devops/docker/Dockerfile.backend): A single-stage build using a lightweight `node:18-alpine` base image. It installs only dependencies matching the production tag, copies server files, and exposes port `5000`.
*   [Dockerfile.frontend](file:///Users/manthan/Desktop/Devops/docker/Dockerfile.frontend): A multi-stage build. 
    1.  *Stage 1 (build)* uses `node:20-alpine`, runs `npm run build` with memory constraints (`--max-old-space-size=512`), compiling the Vite client application into a `dist/` directory.
    2.  *Stage 2 (serve)* copies compiled assets into an `nginx:alpine` image and loads a custom routing config [nginx.conf](file:///Users/manthan/Desktop/Devops/docker/docker/nginx.conf). Nginx acts as both a static web server serving the SPA assets and an API reverse-proxy, redirecting `/api/` calls directly to `http://backend:5000`.

### 5.2 Local Developer Orchestration ([docker-compose.yaml](file:///Users/manthan/Desktop/Devops/docker-compose.yaml))
Defines the local environment:
*   `db`: PostgreSQL database initialized with health checks (`pg_isready`) and preloaded schemas/seeds from `schema.sql`.
*   `backend`: Placed in the same network, waiting for a healthy status signal from the database before spinning up.
*   `frontend`: Exposes port `80` to route local developer browser traffic.

A separate stack [docker-compose.monitoring.yml](file:///Users/manthan/Desktop/Devops/docker/docker-compose.monitoring.yml) spins up local monitoring: Grafana (port `3000`), Kibana (port `5601`), and Elasticsearch (port `9200`) to test telemetry and logging dashboard pipelines before EKS deployment.

---

## 6. CI/CD Lifecycle (Jenkins)

The pipeline is written as a declarative pipeline in [Jenkinsfile](file:///Users/manthan/Desktop/Devops/jenkins/Jenkinsfile). It contains the following stages:

1.  **Checkout**: Pulls code from the main branch of `https://github.com/MSB-io/multi-vendor-commerce.git`.
2.  **Build & Push Backend**: Logs in to ECR using IAM authentication, builds the backend image using [Dockerfile.backend](file:///Users/manthan/Desktop/Devops/docker/Dockerfile.backend), tags it as `latest`, and pushes it to ECR.
3.  **Build & Push Frontend**: Logs in to ECR, builds the frontend image using [Dockerfile.frontend](file:///Users/manthan/Desktop/Devops/docker/Dockerfile.frontend), tags it as `latest`, and pushes it to ECR.
4.  **Deploy to EKS**:
    *   Runs `aws eks update-kubeconfig` to authenticate the Jenkins runner.
    *   Deploys resources defined in the `/kubernetes` directory using `kubectl apply -f kubernetes/`.
    *   Invokes `kubectl rollout restart deployment backend frontend` to trigger a rolling update of the new containers.

---

## 7. Kubernetes Configurations (`/kubernetes`)

Kubernetes resources manage production application pods on the AWS EKS cluster.

*   **Deployments** ([backend-deployment.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/backend-deployment.yaml) and [frontend-deployment.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/frontend-deployment.yaml)):
    *   Run 2 replicas each for high availability.
    *   Point to ECR image paths (`040066346143.dkr.ecr.ap-south-1.amazonaws.com`).
    *   Configure resource limits and requests:
        *   Backend: Requests `100m` CPU / `128Mi` RAM; Limits `500m` CPU / `512Mi` RAM.
        *   Frontend: Requests `50m` CPU / `64Mi` RAM; Limits `200m` CPU / `256Mi` RAM.
*   **Services** ([services.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/services.yaml)):
    *   Backend is mapped as a `ClusterIP` service on port `5000` (kept internal to the cluster).
    *   Frontend is mapped as a `LoadBalancer` service on port `80`, provisioning an AWS Elastic Load Balancer to route external public traffic.
*   **Secret Management** ([db-secret.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/db-secret.yaml)):
    *   Contains the database connection URL (`url: "postgres://postgres:SECRET_PASSWORD@RDS_ENDPOINT_URL:5432/commerce"`).
    *   *Note: In production environments, this secret is automatically injected dynamically via the Vault integration rather than saved in cleartext.*
*   **Autoscaling** ([hpa.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/hpa.yaml)):
    *   Configures a `HorizontalPodAutoscaler` for both frontend and backend.
    *   Defines target limits: scales between `minReplicas: 2` and `maxReplicas: 5` based on average CPU utilization exceeding `70%`.

---

## 8. Troubleshooting & Workarounds (AWS Free Tier Architectural Pivots)

Two notable workarounds were implemented during application rollout to accommodate AWS Free Tier resource limits:

### 8.1 IP Address Exhaustion (ENI Limits)
*   **Problem**: In EKS, the CNI plugin allocates actual VPC IP addresses to each pod. The `t3.micro` EC2 instances used for nodes support a maximum of 2 Elastic Network Interfaces (ENIs), with each interface supporting only 2 IPs. With the EKS system pods (CoreDNS, kube-proxy, aws-node) running, the IP pool was completely exhausted. When Jenkins triggered a rolling deployment (`rollout restart`), the cluster tried to spin up new pods before terminating the old ones, resulting in a scheduling deadlock (pods stuck in `Pending` state due to lack of available IP addresses).
*   **Solution**: The deployment scale was actively pivoted during rollout. The team manually scaled the deployments to zero to terminate the active pods, freeing their IP addresses back into the VPC pool, before scaling the new image tags up to the desired replica count.

### 8.2 EBS Volume Limitations (ELK Stack Deployments)
*   **Problem**: The root filesystem volume of standard Free Tier EC2 instances defaults to 8GB. Pulling and running the heavy ELK stack Docker images (Elasticsearch and Kibana) exceeded the root volume size, throwing disk capacity errors and crashing the EKS nodes.
*   **Solution**: Rather than resizing to expensive storage tiers, the EBS volume was dynamically resized to 20GB (which is within the 30GB Free Tier limit). The DevOps team performed a live filesystem expansion on the partition using `xfs_growfs` to update the operating system disk configuration on the fly without service disruption or database downtime.

---

## 9. Runbook & Command Reference Index

This section lists all critical developer and operator commands across different phases of the lifecycle.

### 9.1 Local Development (Without Containers)
To test and run each subsystem on the host machine manually:

*   **Launch PostgreSQL Locally**:
    ```bash
    # (Using local postgres) Initialize database using schema and seed file
    psql -U postgres -d postgres -f app/backend/db/schema.sql
    ```
*   **Start Backend**:
    ```bash
    cd app/backend
    npm install
    # Run server in dev mode with nodemon hot-reload
    npm run dev
    ```
*   **Start Frontend**:
    ```bash
    cd app/frontend
    npm install
    # Start Vite development server
    npm run dev
    ```

### 9.2 Local Container Orchestration (Docker Compose)
*   **Spin up application services**:
    ```bash
    docker compose up -d --build
    ```
*   **Spin up monitoring tools (Elasticsearch, Kibana, Grafana)**:
    ```bash
    docker compose -f docker/docker-compose.monitoring.yml up -d
    ```
*   **Inspect logs**:
    ```bash
    docker compose logs -f backend
    ```
*   **Shut down application**:
    ```bash
    docker compose down -v
    ```

### 9.3 Infrastructure Operations (Terraform)
*   **Initialize and prepare working environment**:
    ```bash
    cd terraform
    terraform init
    ```
*   **Format and validate terraform configuration**:
    ```bash
    terraform fmt
    terraform validate
    ```
*   **Generate dry-run execution plan**:
    ```bash
    terraform plan -out=tfplan
    ```
*   **Apply planned cloud resources (providing sensitive DB variables)**:
    ```bash
    terraform apply -var="db_password=MySecretPassword123" -auto-approve
    ```
*   **Tear down all cloud resources**:
    ```bash
    terraform destroy -var="db_password=MySecretPassword123" -auto-approve
    ```

### 9.4 Kubernetes & EKS Operations
*   **Authenticate with EKS Cluster**:
    ```bash
    aws eks update-kubeconfig --region ap-south-1 --name commerce-cluster
    ```
*   **Inspect cluster states**:
    ```bash
    # Get active nodes
    kubectl get nodes
    
    # Get all running pods, services, and HPA autoscalers in the current namespace
    kubectl get pods,svc,hpa -o wide
    ```
*   **Manually Apply Manifests**:
    ```bash
    kubectl apply -f kubernetes/
    ```
*   **Rolling Restart Deployments**:
    ```bash
    kubectl rollout restart deployment backend frontend
    ```
*   **Monitor rollout updates**:
    ```bash
    kubectl rollout status deployment/backend
    ```
*   **Inspect Pod logs**:
    ```bash
    kubectl logs -l app=backend --tail=100
    ```

### 9.5 Troubleshooting & Pivoting Runbook Commands

*   **Pivoting EKS Node IP Exhaustion Deadlocks**:
    ```bash
    # Step 1: Scale deployments to 0 to free ENI interfaces IPs
    kubectl scale deployment backend frontend --replicas=0
    
    # Step 2: Verify all pods are terminated and releases IPs
    kubectl get pods
    
    # Step 3: Scale deployments back up to pull latest image versions
    kubectl scale deployment backend frontend --replicas=2
    ```
*   **Live Linux EBS Volume Extension**:
    ```bash
    # Step 1: SSH into target EKS Worker Node EC2 instance
    ssh -i devops-key.pem ec2-user@<NODE_PUBLIC_IP>
    
    # Step 2: Confirm block devices and partitions
    lsblk
    
    # Step 3: Grow the partition 4 of block device nvme0n1
    sudo growpart /dev/nvme0n1 4
    
    # Step 4: Expand the live XFS filesystem
    sudo xfs_growfs /
    
    # Step 5: Verify new space is mapped correctly
    df -h
    ```

