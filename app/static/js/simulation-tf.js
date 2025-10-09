document.addEventListener('DOMContentLoaded', () => {

    // --- Simulated Terraform Apply Output Data ---

    const vpcOutput = [
        `module.vpc.aws_vpc.main_vpc: Creating...`,
        `module.vpc.aws_vpc.main_vpc: Creation complete after 2s [id=vpc-0a1b2c3d4e5f6]`,
        `module.vpc.aws_internet_gateway.main_igw: Creating...`,
        `module.vpc.aws_subnet.public_subnets[0]: Creating...`,
        `module.vpc.aws_subnet.public_subnets[1]: Creating...`,
        `module.vpc.aws_subnet.private_subnets[0]: Creating...`,
        `module.vpc.aws_subnet.private_subnets[1]: Creating...`,
        `module.vpc.aws_subnet.public_subnets[1]: Creation complete after 3s [id=subnet-pub-1]`,
        `module.vpc.aws_subnet.public_subnets[0]: Creation complete after 3s [id=subnet-pub-0]`,
        `module.vpc.aws_subnet.private_subnets[1]: Creation complete after 3s [id=subnet-priv-1]`,
        `module.vpc.aws_internet_gateway.main_igw: Creation complete after 4s [id=igw-0a1b2c3d4]`,
        `module.vpc.aws_route_table.main_route_table: Creating...`,
        `module.vpc.aws_subnet.private_subnets[0]: Creation complete after 5s [id=subnet-priv-0]`,
        `module.vpc.aws_route_table.main_route_table: Creation complete after 1s [id=rtb-0a1b2c3d4]`,
        `module.vpc.aws_route_table_association.public_subnet_association[0]: Creating...`,
        `module.vpc.aws_route_table_association.public_subnet_association[1]: Creating...`,
        `module.vpc.aws_route_table_association.private_subnet_association[0]: Creating...`,
        `module.vpc.aws_route_table_association.private_subnet_association[1]: Creating...`,
        `module.vpc.aws_route_table_association.public_subnet_association[1]: Creation complete after 0s`,
        `module.vpc.aws_route_table_association.public_subnet_association[0]: Creation complete after 0s`,
        `module.vpc.aws_route_table_association.private_subnet_association[1]: Creation complete after 0s`,
        `module.vpc.aws_route_table_association.private_subnet_association[0]: Creation complete after 0s`,
        ``,
        `Apply complete! Resources: 8 added, 0 changed, 0 destroyed.`
    ];

    const eksOutput = [
        `module.eks.aws_iam_role.eks-cluster-iam-role: Creating...`,
        `module.eks.aws_iam_role.node-group-role: Creating...`,
        `module.eks.aws_iam_role.eks-cluster-iam-role: Creation complete after 1s [id=my-cluster-iam-role]`,
        `module.eks.aws_iam_role.node-group-role: Creation complete after 1s [id=my-nodegroup-role]`,
        `module.eks.aws_iam_role_policy_attachment.eks-cluster-policy: Creating...`,
        `module.eks.aws_iam_role_policy_attachment.eks-worker-node-policy: Creating...`,
        `module.eks.aws_iam_role_policy_attachment.eks-cni-policy: Creating...`,
        `module.eks.aws_iam_role_policy_attachment.ec2-container-registry-read-only: Creating...`,
        `module.eks.aws_iam_role_policy_attachment.eks-cluster-policy: Creation complete after 1s`,
        `module.eks.aws_iam_role_policy_attachment.eks-cni-policy: Creation complete after 1s`,
        `module.eks.aws_iam_role_policy_attachment.eks-worker-node-policy: Creation complete after 2s`,
        `module.eks.aws_iam_role_policy_attachment.ec2-container-registry-read-only: Creation complete after 2s`,
        `module.eks.aws_eks_cluster.eks-cluster: Creating...`,
        `module.eks.aws_eks_cluster.eks-cluster: Still creating... [10s elapsed]`,
        `module.eks.aws_eks_cluster.eks-cluster: Still creating... [20s elapsed]`,
        // ... time passes ...
        `module.eks.aws_eks_cluster.eks-cluster: Creation complete after 5m33s [id=my-eks-cluster]`,
        `module.eks.aws_launch_template.naming-nodes: Creating...`,
        `module.eks.aws_security_group.eks_node_sg: Creating...`,
        `module.eks.aws_iam_openid_connect_provider.eks_oidc_provider: Creating...`,
        `module.eks.aws_launch_template.naming-nodes: Creation complete after 1s`,
        `module.eks.aws_security_group.eks_node_sg: Creation complete after 2s`,
        `module.eks.aws_iam_openid_connect_provider.eks_oidc_provider: Creation complete after 8s`,
        `module.eks.aws_eks_node_group.node-group: Creating...`,
        `module.eks.aws_eks_node_group.node-group: Still creating... [30s elapsed]`,
        `module.eks.aws_eks_node_group.node-group: Still creating... [1m0s elapsed]`,
        `module.eks.aws_eks_node_group.node-group: Creation complete after 2m15s`,
        `null_resource.update_kubeconfig: Creating...`,
        `null_resource.update_kubeconfig: Provisioning with local-exec...`,
        `null_resource.update_kubeconfig (local-exec): Updated kubeconfig for context "arn:aws:eks:..."`,
        `null_resource.update_kubeconfig: Creation complete after 1s`,
        ``,
        `Apply complete! Resources: 15 added, 0 changed, 0 destroyed.`
    ];

    const argocdOutput = [
        `module.argocd.kubernetes_namespace.argocd: Creating...`,
        `module.argocd.kubernetes_namespace.argocd: Creation complete after 1s [id=argocd]`,
        `module.argocd.data.aws_secretsmanager_secret_version.argocd_secret: Reading...`,
        `module.argocd.data.aws_secretsmanager_secret_version.argocd_secret: Read complete after 1s`,
        `module.argocd.kubernetes_secret.config_repo_ssh: Creating...`,
        `module.argocd.kubernetes_secret.config_repo_ssh: Creation complete after 0s`,
        `module.argocd.helm_release.argocd: Creating...`,
        `module.argocd.helm_release.argocd: Still creating... [10s elapsed]`,
        `module.argocd.helm_release.argocd: Creation complete after 18s [id=argocd]`,
        `module.argocd.time_sleep.wait_for_crd_registration: Creating...`,
        `module.argocd.time_sleep.wait_for_crd_registration: Creation complete after 30s`,
        ``,
        `Apply complete! Resources: 5 added, 0 changed, 0 destroyed.`
    ];

    const outputs = {
        'argocd-output': argocdOutput,
        'eks-output': eksOutput,
        'vpc-output': vpcOutput,
    };

    // --- Core Simulation Logic ---

    // Function to "type" lines into a <pre> element
    function typeLines(outputElement, lines, onComplete) {
        let lineIndex = 0;
        const cursor = document.createElement('span');
        cursor.className = 'blinking-cursor';
        cursor.textContent = '▋';
        outputElement.appendChild(cursor);

        function nextLine() {
            if (lineIndex < lines.length) {
                const lineText = lines[lineIndex];
                const lineEl = document.createTextNode(lineText + '\n');
                outputElement.insertBefore(lineEl, cursor);
                lineIndex++;

                // Determine delay for the next line
                let delay = 100 + Math.random() * 100; // Small random delay
                if (lineText.includes('Still creating...')) {
                    delay = 1000; // Longer delay for "Still creating"
                } else if (lineText.includes('complete after')) {
                    delay = 500; // Slightly longer for completion lines
                }
                
                setTimeout(nextLine, delay);
            } else {
                cursor.remove(); // Remove cursor when done
                if(onComplete) onComplete();
            }
        }
        nextLine();
    }

    // --- Accordion Event Handling ---

    const accordions = document.querySelectorAll('.code-accordion .accordion-header');

    accordions.forEach(header => {
        header.addEventListener('click', () => {
            // Toggle active class for styling
            header.classList.toggle('active');

            // Toggle icon
            const icon = header.querySelector('.accordion-icon');
            icon.textContent = header.classList.contains('active') ? '-' : '+';
            
            // Handle content display
            const content = header.nextElementSibling;
            if (header.classList.contains('active')) {
                content.style.maxHeight = "1000px";
            } else {
                content.style.maxHeight = null;
            }

            // --- Trigger Simulation ---
            const hasSimulated = header.getAttribute('data-simulated') === 'true';
            const outputId = header.getAttribute('data-output-id');
            const outputElement = document.getElementById(outputId);

            // Run simulation only if accordion is opening and it hasn't run before
            if (header.classList.contains('active') && !hasSimulated) {
                header.setAttribute('data-simulated', 'true');
                const description = header.querySelector('.header-description');
                if (description) {
                    description.textContent = 'Running...';
                }
                
                typeLines(outputElement, outputs[outputId], () => {
                    // On completion, update the description
                    if (description) {
                       description.textContent = 'Simulation complete!';
                    }
                });
            }
        });
    });
});
