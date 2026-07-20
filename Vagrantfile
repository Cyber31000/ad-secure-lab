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

# ---------------------------------------------------------------------------
# Bootstrap : installation du plugin vagrant-reload si manquant
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Patch automatique des OVF des boxes gusztavvargadr
# ---------------------------------------------------------------------------
# Les box recentes gusztavvargadr incluent un item NVRAM avec ResourceType=32768
# que VirtualBox 7.0.x ne sait pas lire, ce qui provoque
#   "Unknown resource type 32768 in hardware item, line 49"
# lors de l'import.
#
# Ce bloc detecte les box installees, retire le noeud NVRAM du box.ovf et
# supprime le manifest (pour eviter un echec de checksum apres modification).
# VirtualBox recreera des reglages UEFI par defaut, les VM demarrent
# normalement. Idempotent : si l'OVF est deja patche, ne fait rien.
def patch_box_ovf(box_name)
  box_slug = box_name.gsub('/', '-VAGRANTSLASH-')
  box_root = File.join(Dir.home, '.vagrant.d', 'boxes', box_slug)
  return unless File.directory?(box_root)

  Dir.glob(File.join(box_root, '*', '*', 'virtualbox', 'box.ovf')).each do |ovf|
    content = File.read(ovf)
    next unless content.include?('<rasd:ResourceType>32768</rasd:ResourceType>')

    File.write("#{ovf}.bak", content) unless File.exist?("#{ovf}.bak")
    content = content.gsub(
      /^\s*<Item>[\s\S]*?<rasd:ResourceType>32768<\/rasd:ResourceType>[\s\S]*?<\/Item>\s*\n?/,
      ''
    )
    content = content.gsub(/^\s*<File[^>]*\.nvram[^>]*\/>\s*\n?/, '')
    File.write(ovf, content)

    mf = ovf.sub(/\.ovf\z/, '.mf')
    File.delete(mf) if File.exist?(mf)

    puts "Patch OVF applique (NVRAM retire pour compat VirtualBox 7.0) : #{box_name}"
  end
end

%w[
  gusztavvargadr/windows-server-2022-standard
  gusztavvargadr/windows-10
].each { |box| patch_box_ovf(box) }

Vagrant.configure("2") do |config|

  # -------------------------------------------------------------------------
  # Parametres communs a toutes les VM
  # -------------------------------------------------------------------------
  # Timeouts genereux : le premier boot d'un Windows Server / Windows 10 est
  # lent, et la sequence promotion DC + reload demande de la patience.
  config.vm.boot_timeout            = 1800
  config.vm.graceful_halt_timeout   = 600

  # WinRM en Basic Auth sur HTTP : evite les hangs de negotiation Kerberos
  # apres la promotion du DC (transition NTLM -> Kerberos non geree par le
  # transport negotiate par defaut).
  config.winrm.transport            = :plaintext
  config.winrm.basic_auth_only      = true
  config.winrm.timeout              = 1800
  config.winrm.retry_limit          = 100

  # -------------------------------------------------------------------------
  # Controleur de domaine : AD DS + DNS
  # -------------------------------------------------------------------------
  config.vm.define "dc01" do |dc|
    dc.vm.box      = "gusztavvargadr/windows-server-2022-standard"
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

    # Etape 4 : installation de DFS-N + DFS-R et preparation des dossiers partages
    dc.vm.provision "shell", path: "scripts/dc/04-install-dfs.ps1"
  end

  # -------------------------------------------------------------------------
  # Controleur de domaine additionnel : replique DC01, membre DFS-R
  # -------------------------------------------------------------------------
  config.vm.define "dc02" do |dc2|
    dc2.vm.box      = "gusztavvargadr/windows-server-2022-standard"
    dc2.vm.hostname = "DC02"

    dc2.vm.network "private_network", ip: "192.168.56.11"

    dc2.vm.provider "virtualbox" do |vb|
      vb.name   = "ad-lab-dc02"
      vb.memory = 4096
      vb.cpus   = 2
      vb.gui    = false
    end

    # Etape 1 : pointage DNS vers DC01 + installation du role AD DS
    dc2.vm.provision "shell", path: "scripts/dc2/01-install-adds-role.ps1"

    # Etape 2 : promotion comme controleur de domaine additionnel dans lab.local
    dc2.vm.provision "shell", path: "scripts/dc2/02-promote-additional-dc.ps1"

    # Reboot pour finaliser la promotion
    dc2.vm.provision :reload

    # Etape 3 : DFS complet (roles, replication SharedData avec DC01, namespace
    # \\lab.local\Public, fichier Welcome.txt, GPO d'ouverture au login)
    dc2.vm.provision "shell", path: "scripts/dc2/03-configure-dfs.ps1"
  end

  # -------------------------------------------------------------------------
  # Poste client : Windows 10 joint au domaine
  # -------------------------------------------------------------------------
  config.vm.define "cli01" do |cli|
    cli.vm.box      = "gusztavvargadr/windows-10"
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
