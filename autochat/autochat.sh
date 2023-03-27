autochat-serve(){
  source env.sh
  envsubst '$CHATGPT_APIKEY' < app.js.env > app.js
  python -m http.server 
}
