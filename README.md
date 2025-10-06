# My Personal Website & Portfolio

This repository contains the source code for my personal portfolio website. The primary goal of this site is to serve as an elaborate, interactive CV, showcasing my skills, knowledge, and the technologies I work with. It now includes a PostgreSQL database to track and record website traffic.

## 🏛️ Project Architecture

This website is part of a larger cloud-native project, deployed on AWS EKS. The entire infrastructure and deployment pipeline are managed across three dedicated repositories:

-   **🌐 [mywebsite-app](https://github.com/liormilliger/mywebsite-app.git) (This Repo):** Contains the Python/Flask application code, HTML/CSS for the frontend, and Docker configuration for containerization.
-   **🔧 [mywebsite-k8s](https://github.com/liormilliger/mywebsite-k8s.git):** Holds the Kubernetes deployment files and ArgoCD App-of-Apps manifests for GitOps-based deployment.
-   **🏗️ [mywebsite-iac](https://github.com/liormilliger/mywebsite-iac.git):** Includes the Terraform Infrastructure as Code (IaC) to provision the AWS VPC, EKS cluster, and deploy ArgoCD via its Helm chart.

## 🚀 Tech Stack

-   **Backend:** Python with [Flask](https://flask.palletsprojects.com/en/2.2.x/)
-   **Database:** [PostgreSQL](https://www.postgresql.org/)
-   **Frontend:** HTML5 & CSS3
-   **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
-   **Web Server:** [Nginx](https://www.nginx.com/) (used as a reverse proxy)

## 🐳 Docker Configuration

This repository includes a multi-container setup orchestrated by Docker Compose to run the full application stack.

-   `Dockerfile`: A simple Dockerfile that containerizes the Flask application, creating a lightweight and optimized image.
-   `docker-compose.yml`: This file defines three services:
    -   **`app`**: The Python/Flask application service. It waits for the `db` service to be healthy before starting, ensuring the database is ready to accept connections.
    -   **`nginx`**: An Nginx service that acts as a reverse proxy, handling incoming traffic on port `80` and forwarding it to the `app` service.
    -   **`db`**: A PostgreSQL database service. It uses a named volume (`postgres_data`) to persist data across container restarts and runs initialization scripts from the `./init` directory on its first launch. A health check is configured to ensure the database is running and ready.

## 💻 Running the Application Locally

You can run the application in two ways: as a standalone Flask app (without the database) or as a full-stack application using Docker Compose.

### Method 1: Running Standalone (without Database)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/liormilliger/mywebsite-app.git](https://github.com/liormilliger/mywebsite-app.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd mywebsite-app
    ```

3.  **Create and activate a virtual environment:**
    * **On macOS/Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    * **On Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

4.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the Flask application:**
    ```bash
    python3 app-local.py
    ```

6.  **Open your browser and navigate to the following address:**
    [http://localhost:5000](http://localhost:5000)

### Method 2: Running with Docker Compose (Full Stack)

This method will launch the Flask application, the Nginx reverse proxy, and the PostgreSQL database.

1.  **Ensure you have Docker and Docker Compose installed.**

2.  **Clone and navigate to the repository directory** (if you haven't already).

3.  **Build and run the services using Docker Compose:**
    ```bash
    docker-compose up --build
    ```

4.  **Open your browser and navigate to the following address:**
    [http://localhost:80](http://localhost:80)
    