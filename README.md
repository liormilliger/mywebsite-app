# My Personal Website & Portfolio

This repository contains the source code for my personal portfolio website. The primary goal of this site is to serve as an elaborate, interactive CV, showcasing my skills, knowledge, and the technologies I work with.

## 🏛️ Project Architecture

This website is part of a larger cloud-native project, deployed on AWS EKS. The entire infrastructure and deployment pipeline are managed across three dedicated repositories:

-   **🌐 [mywebsite-app](https://github.com/liormilliger/mywebsite-app.git) (This Repo):** Contains the Python/Flask application code, HTML/CSS for the frontend, and Docker configuration for containerization.
-   **🔧 [mywebsite-k8s](https://github.com/liormilliger/mywebsite-k8s.git):** Holds the Kubernetes deployment files and ArgoCD App-of-Apps manifests for GitOps-based deployment.
-   **🏗️ [mywebsite-iac](https://github.com/liormilliger/mywebsite-iac.git):** Includes the Terraform Infrastructure as Code (IaC) to provision the AWS VPC, EKS cluster, and deploy ArgoCD via its Helm chart.

## 🚀 Tech Stack

-   **Backend:** Python with [Flask](https://flask.palletsprojects.com/en/2.2.x/)
-   **Frontend:** HTML5 & CSS3
-   **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
-   **Web Server:** [Nginx](https://www.nginx.com/) (used as a reverse proxy in the Docker Compose setup)

## 🐳 Docker Configuration

This repository includes:

-   `Dockerfile`: A simple Dockerfile that containerizes the Flask application, creating a lightweight and optimized image.
-   `docker-compose.yml`: A Docker Compose file that orchestrates the application and an Nginx service. The Nginx service acts as a reverse proxy, serving static files and exposing the application on the standard port `80`, rather than the default Flask port (`5000`).

## 💻 Running the Application Locally

To run the application on your local machine, follow these steps:

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
    pip install Flask prometheus-flask-exporter
    ```

5.  **Run the Flask application:**
    ```bash
    python3 app.py
    ```

6.  **Open your browser and navigate to the following address:**
    [http://localhost:5000](http://localhost:5000)

