#!/usr/bin/env bash
set -euo pipefail

CREATE_FILES=0
OVERWRITE_ALL=0

while getopts ":yYh" opt; do
  case $opt in
    y) CREATE_FILES=1 ;;
    Y) CREATE_FILES=1; OVERWRITE_ALL=1 ;;
    h) echo "Usage: $0 [-y|-Y] [inputfile]"; exit 0 ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
  esac
done
shift $((OPTIND-1))

input="${1:-/dev/stdin}"

state="OUT"
dir=""
file=""
content=""

output_file() {
  [[ -z "$dir" || -z "$file" ]] && return
  path="$dir/$file"
  if [[ $CREATE_FILES -eq 0 ]]; then
    echo "----- $path -----"
    printf '%s' "$content"
  else
    write=0
    if [[ ! -e "$path" ]]; then
      write=1
    elif [[ $OVERWRITE_ALL -eq 1 ]]; then
      write=1
    else
      read -p "Overwrite '$path'? (y/N) " -n 1 reply </dev/tty
      echo
      [[ $reply =~ ^[Yy]$ ]] && write=1
    fi
    if [[ $write -eq 1 ]]; then
      mkdir -p "$(dirname "$path")"
      printf '%s' "$content" > "$path"
    fi
  fi
}

while IFS= read -r line || [[ -n $line ]]; do
  case "$state" in
    "OUT")
      if [[ "$line" == "#MULTICAT_START" ]]; then
        state="HEADER"
        dir=""
        file=""
        content=""
      fi
      ;;
    "HEADER")
      if [[ "$line" == "#MULTICAT_END" ]]; then
        state="IN"
      elif [[ "$line" =~ ^#\ *dir:\ (.*) ]]; then
        dir="${BASH_REMATCH[1]}"
      elif [[ "$line" =~ ^#\ *file:\ (.*) ]]; then
        file="${BASH_REMATCH[1]}"
      fi
      ;;
    "IN")
      if [[ "$line" == "#MULTICAT_START" ]]; then
        output_file
        state="HEADER"
        dir=""
        file=""
        content=""
      elif [[ "$line" == "#MULTICAT_END" ]]; then
        output_file
        state="OUT"
        dir=""
        file=""
        content=""
      else
        content+="$line"$'\n'
      fi
      ;;
  esac
done < "$input"

# At end of file, flush if necessary
if [[ "$state" == "IN" ]]; then
  output_file
fi
