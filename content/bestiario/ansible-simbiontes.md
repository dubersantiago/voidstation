---
id: ansible-simbiontes
nombre: Simbiontes
especie: Symbiotica configurans
componente: Ansible
sector: fundicion
estado: en_construccion
individuos: ???
sprite: ansible-simbiontes
hitbox: [12, 12]
comportamiento: enjambre
estado_fotogenico: adheridos
rango_ideal: [16, 64]
radio_huida: 0
host: ???
relaciones: [terraform-arquitecta, mysql-archivista, minecraft-cubica]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Configuración de las VMs después de que Terraform las crea.

## ★★
Inventario por grupos (`databases`, `minecraft`); cada grupo recibe sus roles en `playbooks/site.yml`. Las VMs con cloud-init se crean con el usuario `debian` (sudo sin contraseña) y la llave SSH del homelab.

Roles:
- `common`: espera a cloud-init, instala paquetes base, fija la zona horaria y activa ufw permitiendo SSH antes.
- `minecraft`: servidor de Minecraft como servicio systemd.

Pendientes: rol para la base de datos y stage de Ansible en Jenkins.

## ★★★
Todos los comandos se ejecutan desde `ansible/`, para que se cargue `ansible.cfg`:

```bash
ansible-galaxy collection install -r requirements.yml
ansible all -m ping                       # conectividad SSH
ansible all -m command -a whoami --become # sudo (debe responder root)
ansible-playbook playbooks/site.yml
ansible-playbook playbooks/site.yml --limit minecraft
```

Si `ping` falla, el problema es SSH (IP, usuario o llave). Si falla `whoami --become`, el usuario no tiene sudo.

## Registro
> "Esperan junto a la tejedora. Cuando algo nuevo nace, ya saben qué hacer con él."
