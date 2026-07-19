# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# Lab Active Directory securise - infrastructure as code
# Cible : 1 controleur de domaine + 1 poste client Windows joints au domaine lab.local
# Reseau : host-only prive en 192.168.56.0/24
#
# Demarrage :
#   vagrant up
#
# La promotion d'un controleur de domaine et la jonction au domaine imposent des
# redemarrages. Le plugin vagrant-reload gere ces reboots de maniere ordonnee.
# Il est installe automatiquement au premier `vagrant up` s'il manque.

required_plugins = %w(vagrant-reload)
plugins_to_install = required_plugins.reject { |plugin| Vagrant.has_plugin?(plugin) }
unless plugins_to_install.empty?
  puts "Installation des plugins Vagrant requis : #{plugins_to_install.join(', ')}"
  if system "vagrant plugin install #{plugins_to_install.join(' ')}"
    exec "vagrant #{ARGV.join(' ')}"
  else
    abort "Echec de l'installation des plugins Vagrant : #{plugins_to_install.join(', ')}."
  end
end

Vagrant.configure("2") do |config|

  # Parametres communs a toutes les VM
  config.vm.boot_timeout = 600
  config.winrm.timeout   = 600
  config.winrm.retry_limit = 30

  # ---------------------------------------------------------------------------
  # Controleur de domaine : AD DS + DNS
  # ---------------------------------------------------------------------------
  config.vm.define "dc01" do |dc|
    dc.vm.box      = "gusztavvargadr/windows-server"
    dc.vm.hostname = "DC01"

    dc.vm.network "private_network", ip: "192.168.56.10"

    dc.vm.provider "virtualbox" do |vb|
      vb.name   = "ad-lab-dc01"
      vb.memory = 4096
      vb.cpus   = 2
      vb.gui    = false
    end

    # Etape 1 : installation du role AD DS et promotion en foret
    dc.vm.provision "shell", path: "scripts/dc/01-install-adds.ps1"

    # Reboot apres promotion : la VM revient en tant que controleur de domaine
    dc.vm.provision :reload

    # Etape 2 : structure d'OU, groupes, comptes utilisateurs, forwarder DNS
    dc.vm.provision "shell", path: "scripts/dc/02-configure-ad.ps1"

    # Etape 3 : durcissement par GPO (politique mot de passe, LLMNR, SMBv1, LDAP, audit)
    dc.vm.provision "shell", path: "scripts/dc/03-apply-gpo.ps1"
  end

  # ---------------------------------------------------------------------------
  # Poste client : Windows 11 joint au domaine
  # ---------------------------------------------------------------------------
  config.vm.define "cli01" do |cli|
    cli.vm.box      = "gusztavvargadr/windows-11"
    cli.vm.hostname = "CLI01"

    cli.vm.network "private_network", ip: "192.168.56.20"

    cli.vm.provider "virtualbox" do |vb|
      vb.name   = "ad-lab-cli01"
      vb.memory = 4096
      vb.cpus   = 2
      vb.gui    = false
    end

    # Etape 1 : pointage DNS vers le controleur de domaine puis jonction au domaine
    cli.vm.provision "shell", path: "scripts/client/01-join-domain.ps1"

    # Reboot pour finaliser la jonction au domaine
    cli.vm.provision :reload
  end

end
