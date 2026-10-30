---
id: terraform-arquitecta
nombre: La Arquitecta
especie: Textrix declarativa
componente: Terraform
sector: fundicion
estado: confirmado
individuos: 1
sprite: terraform-arquitecta
hitbox: [56, 56]
comportamiento: inmovil
estado_fotogenico: plan
rango_ideal: [64, 160]
radio_huida: 0
host: ???
relaciones: [jenkins-vigia, titan-proxmox, ansible-simbiontes]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Aprovisionamiento: crea las máquinas virtuales y los contenedores LXC en Proxmox.

## ★★
Usa el provider `bpg/proxmox` (`~> 0.80`) y dos módulos propios con `for_each`:

- `proxmox-lxc`: contenedores LXC, definidos en `local.lxc_containers`.
- `proxmox-vm`: VMs, definidas en `local.vms`. Cada VM arranca desde un ISO (Talos) o se clona de una plantilla con cloud-init, que aplica IP, gateway y llave SSH.

Se ejecuta desde el pipeline de Jenkins, nunca a mano contra la infraestructura. El state es local en el servidor de Jenkins; está pendiente decidir dónde guardarlo fuera de él (propuesta: Cloudflare R2).

## ★★★
Flujo: `terraform fmt -check -recursive` → `validate` → `plan -out=tfplan` → revisión y aprobación → `apply tfplan`.

Agregar una VM: añadir la entrada en `terraform/proxmox/machines.tf`, hacer push y aprobar el plan en Jenkins.

Las variables con secretos van en `terraform.tfvars`, que no se versiona: vive como credential en Jenkins.

## Registro
> "Antes de tejer, proyecta lo que va a cambiar. Nunca teje sin que alguien mire."
