server {
    listen 80;
    server_name do1.placeholdermedia.com;

    location / {
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto http;
        proxy_ssl_server_name on;
        proxy_set_header Host $host;
        proxy_redirect off;
        proxy_pass http://192.34.62.148:4404/;
    }
}

server {
    server_name placeholdermedia.com;
    server_name *.placeholdermedia.com;

    # Rewrite rule to add trailing slash
    #rewrite ^([^.]*[^/])$ $1/ permanent;
    rewrite ^(?!/upload$)([^.]*/[^/])$ $1/ permanent;


    location /abracalab/ {
        proxy_http_version 1.1;
       # proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host "phmedia.nyc3.digitaloceanspaces.com";
        proxy_set_header X-Forwarded-Proto https;
        proxy_ssl_server_name on;
        #proxy_set_header Host $host;
        proxy_redirect off;
       index index.html;

        proxy_pass https://phmedia.nyc3.digitaloceanspaces.com/abracalab/;
    }

    location /uploads/ {
    root /var/www/phm;
    autoindex on;
    }


    location /upload {
	    proxy_pass http://unix:/var/www/phm/api/ph-api.sock;
	    proxy_set_header Host $host;
	    proxy_set_header X-Real-IP $remote_addr;
	    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	    proxy_set_header X-Forwarded-Proto $scheme;
	    proxy_set_header Authorization "Bearer iamthat";
    }

    location / {
        root /var/www/phm/html;
        index index.html;
    }
    location /OLD_CUR_BROKEN {
       proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_ssl_server_name on;
        proxy_set_header Host $host;
        proxy_redirect off;
        proxy_pass http://localhost:1404;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/placeholdermedia.com-0001/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/placeholdermedia.com-0001/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}


server {
    if ($host = placeholdermedia.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    server_name placeholdermedia.com;
    server_name *.placeholdermedia.com;
    listen 80;
    return 404; # managed by Certbot
}
