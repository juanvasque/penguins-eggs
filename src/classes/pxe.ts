/**
 * penguins-eggs: pxe.ts
 * author: Piero Proietti
 * mail: piero.proietti@gmail.com
 */
import os from 'node:os'
import fs from 'fs'
import Utils from '../classes/utils'
import Settings from '../classes/settings'

import http from 'http'
import { IncomingMessage, ServerResponse } from 'http';
import { exec } from '../lib/utils'
import path, { dirname } from 'node:path'
import Distro from './distro'

/**
* Pxe:
*/
export default class Pxe {
    verbose = false

    echo = {}

    settings = {} as Settings
    pxeRoot = ''
    isos: string[] = []
    vmlinuz = ''
    initrd = ''

    /**
     * fertilization()
     */
    async fertilization() {
        this.settings = new Settings()
        await this.settings.load()
        this.pxeRoot = path.dirname(this.settings.work_dir.path) + '/pxe/'
        let isos = fs.readdirSync(path.dirname(this.settings.work_dir.path))
        for (const iso of isos) {
            if (path.extname(iso) === ".iso") {
                this.isos.push(iso)
            }
        }

        let files = fs.readdirSync(path.dirname(this.settings.work_dir.path) + '/ovarium/iso/live')
        for (const file of files) {
            // console.log(path.basename(file).substring(0,7))
            if (path.basename(file).substring(0, 7) === 'vmlinuz') {
                this.vmlinuz = path.basename(file)
            }
            if (path.basename(file).substring(0, 6) === 'initrd') {
                this.initrd = path.basename(file)
            }
        }
    }

    /**
     * structure
     */
    async structure() {
        if (fs.existsSync(this.pxeRoot)) {
            await this.tryCatch(`rm ${this.pxeRoot} -rf`)
        }
        let cmd = `mkdir -p ${this.pxeRoot}`
        await this.tryCatch(cmd)

        const distro = new Distro()

        await this.tryCatch(`mkdir -p ${this.pxeRoot}`)
        await this.tryCatch(`mkdir -p ${this.pxeRoot}/lib`)

        await this.tryCatch(`ln ${distro.pxelinuxPath}pxelinux.0 ${this.pxeRoot}/pxelinux.0`)
        await this.tryCatch(`ln ${distro.pxelinuxPath}lpxelinux.0 ${this.pxeRoot}/lpxelinux.0`)

        await this.tryCatch(`ln ${distro.syslinuxPath}ldlinux.c32 ${this.pxeRoot}/ldlinux.c32`)
        await this.tryCatch(`ln ${distro.syslinuxPath}vesamenu.c32 ${this.pxeRoot}/vesamenu.c32`)
        await this.tryCatch(`ln ${distro.syslinuxPath}libcom32.c32 ${this.pxeRoot}/libcom32.c32`)
        await this.tryCatch(`ln ${distro.syslinuxPath}libutil.c32 ${this.pxeRoot}/libutil.c32`)
        await this.tryCatch(`ln /usr/lib/syslinux/memdisk ${this.pxeRoot}/memdisk`)

        await this.tryCatch(`ln /home/eggs/ovarium/iso/isolinux/isolinux.theme.cfg ${this.pxeRoot}/isolinux.theme.cfg`)
        await this.tryCatch(`ln /home/eggs/ovarium/iso/isolinux/splash.png ${this.pxeRoot}/splash.png`)
        for (const iso of this.isos) {
            await this.tryCatch(`ln /home/eggs/${iso} ${this.pxeRoot}/${iso}`)
        }
        await this.tryCatch(`mkdir ${this.pxeRoot}/pxelinux.cfg`)

        await this.tryCatch(`ln /home/eggs/ovarium/iso/live/filesystem.squashfs ${this.pxeRoot}/filesystem.squashfs`)
        await this.tryCatch(`ln /home/eggs/ovarium/iso/live/${this.vmlinuz} ${this.pxeRoot}/${this.vmlinuz}`)
        await this.tryCatch(`ln /home/eggs/ovarium/iso/live/${this.initrd} ${this.pxeRoot}/${this.initrd}`)
        await this.tryCatch(`ln -s /home/eggs/ovarium/iso/.disk/ ${this.pxeRoot}/.disk`)

        let content = ``
        content += `# eggs: pxelinux.cfg/default\n`
        content += `# search path for the c32 support libraries (libcom32, libutil etc.)\n`
        content += `path\n`
        content += `include isolinux.theme.cfg\n`
        content += `UI vesamenu.c32\n`
        content += `\n`
        content += `menu title Penguin's eggs - Perri's brewery edition - ${Utils.address()}\n`
        content += `PROMPT 0\n`
        content += `TIMEOUT 0\n`
        content += `\n`
        content += `LABEL filesystem\n`
        content += `MENU LABEL ${this.isos[0]}\n`
        content += `KERNEL http://${Utils.address()}/${this.vmlinuz}\n`
        content += `APPEND initrd=http://${Utils.address()}/${this.initrd} boot=live config noswap noprompt fetch=http://${Utils.address()}/filesystem.squashfs\n`
        content += `SYSAPPEND 3\n`
        content += `\n`
        content += `MENU SEPARATOR\n`
        for (const iso of this.isos) {
            content += `\n`
            content += `LABEL isos\n`
            content += `MENU LABEL ${iso} (memdisk)\n`
            content += `KERNEL memdisk\n`
            content += `APPEND iso initrd=http://${Utils.address()}/${iso}\n`
        }
        let file = `${this.pxeRoot}/pxelinux.cfg/default`
        fs.writeFileSync(file, content)
        console.log(content)

        file = `${this.pxeRoot}/index.html`
        content = ``
        content += `<html><title>Penguin's eggs PXE server</title>`
        content += `<div style="background-image:url('/splash.png');background-repeat:no-repeat;width: 640;height:480;padding:5px;border:1px solid black;">`
        content += `<h1>Penguin's eggs PXE server</h1>`
        content += `<body>address: <a href=http://${Utils.address()}>${Utils.address()}</a><br/>`
        content += `serving: <a href='http://${Utils.address()}/${this.isos[0]}'>${this.isos[0]}</a><br/><br/>`
        content += `source: <a href='https://github.com/pieroproietti/penguins-eggs'>https://github.com/pieroproietti/penguins-eggs</a><br/>`
        content += `manual: <a href='https://penguins-eggs.net/book/italiano9.2.html'>italiano</a>, <a href='https://penguins--eggs-net.translate.goog/book/italiano9.2?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en'>translated</a><br/>`
        content += `discuss: <a href='https://t.me/penguins_eggs'>Telegram group<br/></body</html>`
        fs.writeFileSync(file, content)

    }

    /**
     * 
     */
    async dnsMasq() {
        let domain = `penguins-eggs.lan`

        let content = ``
        content += `# copy and paste in /etc/dnsmasq.conf\n\n`
        content += `#\n`
        content += `# Don't function as a DNS server:\n`
        content += `port=0\n\n`
        content += `# Log lots of extra information about DHCP transactions.\n`
        // content += `log-dhcp\n\n`
        // content += `log-queries\n\n`
        content += `log-facility=/home/artisan/dnsmasq.log\n\n`
        content += `interface=${await Utils.iface()}\n\n`
        content += `bind-interfaces\n\n`
        content += `domain=${domain}\n\n`

        // dhcp-full
        content += `dhcp-range=${await Utils.iface()},192.168.1.1,192.168.1.254,255.255.255.0,8h\n\n`

        // dhcp - proxy
        // content += `dhcp-range=${await Utils.iface()},192.168.1.1,proxy\n\n`

        content += `# router\n`
        content += `dhcp-option=option:router,192.168.1.1\n\n`
        content += `# dns\n`
        content += `dhcp-option=option:dns-server,192.168.1.1\n\n`
        content += `dhcp-option=option:dns-server,8.8.8.8\n\n`
        content += `dhcp-option=option:dns-server,8.8.4.4\n\n`
        content += `enable-tftp\n\n`
        content += `tftp-root=${this.pxeRoot}\n\n`
        content += `pxe-prompt="Booting PXE Client", 5\n\n`
        content += `# boot config for BIOS systems\n\n`
        content += `dhcp-match=set:bios-x86,option:client-arch,0\n\n`
        content += `dhcp-boot=tag:bios-x86,lpxelinux.0\n\n`
        content += `# boot config for UEFI systems\n\n`
        content += `dhcp-match=set:efi-x86_64,option:client-arch,7\n\n`
        content += `dhcp-match=set:efi-x86_64,option:client-arch,9\n\n`
        content += `dhcp-boot=tag:efi-x86_64,lpxelinux.0\n\n`

        let file = '/etc/dnsmasq.d/cuckoo.conf'
        fs.writeFileSync(file, content)

        await exec(`systemctl stop dnsmasq.service`)
        await exec(`rm /home/artisan/dnsmasq.log\n`)

        await exec(`systemctl start dnsmasq.service`)
    }

    /**
    * 
    * @param cmd 
    */
    async tryCatch(cmd = '') {
        try {
            await exec(cmd, this.echo)
        } catch (error) {
            console.log(`Error: ${error}`)
            await Utils.pressKeyToExit(cmd)
        }
    }

    /**
     * start http server for images
     */
    async httpStart() {
        const port = 80
        const httpRoot = this.pxeRoot + "/"
        http.createServer(function (req: IncomingMessage, res: ServerResponse) {
            if (req.url === '/') {
                req.url = '/index.html'
            }
            
            fs.readFile(httpRoot + req.url, function (err, data) {
                if (err) {
                    res.writeHead(404)
                    res.end(JSON.stringify(err))
                    return
                }
                res.writeHead(200)
                res.end(data)
            });
        }).listen(80)
    }
}
