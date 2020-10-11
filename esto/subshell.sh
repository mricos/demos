#!/usr/bin/env -i bash --noprofile --norc
source ./esto.sh
while true; do 
  printf "esto> "
  read -a cmd
  echo "Length of array: ${#cmd}"
  ${cmd[@]}
done
