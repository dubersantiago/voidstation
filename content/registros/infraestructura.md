---
id: infraestructura
titulo: Monolito de Infraestructura
sector: archivos
publico: true
---

Repositorio de infraestructura como código del homelab. Git es la fuente de verdad: nada se configura a mano en los servidores si puede definirse aquí.

| Herramienta | Responsabilidad |
| --- | --- |
| Terraform | Crear VMs y contenedores LXC en Proxmox |
| Ansible | Configurar el sistema y los servicios de las VMs |
| Jenkins | Ejecutar Terraform con plan, revisión y aprobación manual |
| Talos | Sistema operativo de los nodos de Kubernetes |

```text
terraform/    módulos proxmox-lxc y proxmox-vm; máquinas en proxmox/machines.tf
ansible/      inventario, playbooks y roles
talos/        generación de configuraciones del cluster
scripts/      creación de plantillas en Proxmox
docs/         documentación
Jenkinsfile   pipeline
```

Las aplicaciones de Kubernetes no van aquí: viven en el repositorio GitOps.

Los secretos no se versionan (`terraform.tfvars`, `secrets.yaml` de Talos).

Pendiente:
- Stage de Ansible en el pipeline de Jenkins.
- Rol de Ansible para la base de datos.
- Guardar el state de Terraform fuera del servidor de Jenkins (propuesta: Cloudflare R2).
