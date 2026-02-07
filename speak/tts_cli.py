import pyttsx3
import argparse
import sys
import os

def list_voices(engine):
    voices = engine.getProperty('voices')
    print("Available voices:")
    for index, voice in enumerate(voices):
        print(f"{index}: {voice.name} ({voice.languages})")
    return voices

def read_text_file(file_path):
    if not os.path.isfile(file_path):
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def speak_text(engine, text):
    engine.say(text)
    engine.runAndWait()

def main():
    parser = argparse.ArgumentParser(description="Text-to-Speech CLI using pyttsx3")
    parser.add_argument("file", help="Path to the text file")
    parser.add_argument("-v", "--voice", type=int, help="Voice index to use (use --list-voices to see options)")
    parser.add_argument("--list-voices", action="store_true", help="List available voices and exit")

    args = parser.parse_args()

    engine = pyttsx3.init()
    voices = engine.getProperty('voices')

    if args.list_voices:
        list_voices(engine)
        sys.exit(0)

    if args.voice is not None:
        if 0 <= args.voice < len(voices):
            engine.setProperty('voice', voices[args.voice].id)
        else:
            print("Invalid voice index. Use --list-voices to see valid indices.")
            sys.exit(1)

    text = read_text_file(args.file)
    speak_text(engine, text)

if __name__ == "__main__":
    main()
