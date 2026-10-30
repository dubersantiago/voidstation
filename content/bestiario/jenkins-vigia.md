---
id: jenkins-vigia
nombre: Vigía de Compuerta
especie: Ianitor pipelinae
componente: Jenkins — pipeline con aprobación manual
sector: fundicion
estado: confirmado
individuos: 1
sprite: jenkins-vigia
hitbox: [56, 88]
comportamiento: inmovil
estado_fotogenico: aprobacion
rango_ideal: [64, 160]
radio_huida: 0
host: ???
relaciones: [terraform-arquitecta, cloudflare-gusano]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Automatización de pipelines: ejecuta Terraform con revisión y aprobación manual.

## ★★
Ejecuta el `Jenkinsfile` de la raíz del repo de infraestructura:

`Checkout` → `Terraform Init` → `Format` → `Validate` → `Plan` → `Safety Check` → `Archive Plan` → `Approval` → `Apply`

- El `apply` usa exactamente el plan revisado (`tfplan`).
- El *Safety Check* aborta si el plan destruye o reemplaza recursos.
- Está expuesto a internet a través del túnel de Cloudflare.

## ★★★
Actualizar el `.tfvars`: **Manage Jenkins → Credentials** → actualizar el credential y subir el archivo nuevo.

Pendiente: un stage de Ansible después de `Terraform Apply` que ejecute `ansible-playbook playbooks/site.yml` con una llave SSH guardada como credential.

## Registro
> "Todo lo que pasa por la cinta se detiene frente a su ojo."
