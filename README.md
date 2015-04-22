This was an experiment in using named web sockets with an old demo from the NoTube project. It's nonsense mostly, but does work for that limited application.

For my own reference (see (NamedWebSockets page)[https://github.com/namedwebsockets/networkwebsockets/wiki/Building-a-Network-Web-Socket-Proxy-from-Source]) on a Raspebrry Pi 2:

*note* this only works with jessie, I think - the default on wheezy is too old. Try http://www.zipplet.co.uk/index.php/content/raspberrypi_golang otherwise, it's easy.

    sudo apt-get install golang mercurial -y

    mkdir go
    cd go
    export GOPATH=/home/pi/go

    go get github.com/namedwebsockets/cmd/networkwebsockets

    cd `go list -f '{{.Dir}}' github.com/namedwebsockets/cmd/networkwebsockets`

    go run run.go -port=9009    

Sample minimal nginx file:

    /etc/nginx $ cat nginx.conf

    http {
        server {
            location / {
                root /var/www/html;
            }
        }
    }
    events { worker_connections 1024; }


To run this on remote browsers (yes I'm aware it's not supposed to work that way, this was for a demo), you need to 

    fix namedwebsockets.js to ip or radiodan.local

    and namedwebsockets/networkwebsockets/service.go to ip or radiodan.local (and remove retriction on access to local ips)


