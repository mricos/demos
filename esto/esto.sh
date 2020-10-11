alias p1='aplay -f dat -t raw track1.raw'
alias p2='aplay -f dat -t raw track2.raw'
alias r1='arecord -f dat -t raw track1.raw'
alias r2='arecord -f dat -t raw track2.raw'

esto(){
  rm -f ./inputFifo
  mkfifo ./inputFifo
  arecord -c 1 -f dat -t raw > ./inputFifo &
  echo $! >> ./pids
  echo 'estorec-{rec,overdub,stop,quit}'
}

esto-play(){
  cat track1.raw | aplay -f dat -t raw - &
}

esto-kill(){
  kill $(< ./pids) 
  cat /dev/null > ./pids
  rm -f ./inputFifo
}
esto-rec(){
  
  cat ./inputFifo >> ./record.raw &
  echo $! >> ./pids
}
esto-monitor(){
  cat ./inputFifo | xxd 
  echo $! >> ./pids
}
esto-overdub(){
  esto-play 
  esto-rec
}

esto-quit(){
  esto-stop
  esto-kill
}

# $1 freq
# $2 gain (or attenuation) in dB
esto-sine(){
  play -n -c1 synth sin $1 gain $2 &
  echo $! >> ./pids
}
