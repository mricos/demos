devchat-serve(){
  source ./env.sh
  envsubst '$OPENAI_API_KEY $MAX_TOKENS' < ./src/app.js.env > ./local/app.js
  cp src/index.html ./local/
  cp src/style.css ./local/
  (cd local; python -m http.server )
}
