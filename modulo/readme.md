https://fabianlee.org/2016/09/26/ubuntu-simulating-a-web-server-using-netcat/


while true; do { echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n$(cat simplex.svg)" |  nc -vl 8080; } done
