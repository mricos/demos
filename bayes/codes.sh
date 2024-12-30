tetra_prompt_show_codes(){
cat <<EOF
#reference only
promptUser="\u"
promptHostShort="\h"
promptHostFull="\H"
promptDirShort="\W"
promptDirFull="\w"
promptTime24="\t"
promptTime12="@"
promptTime24Full="\T"
promptDate="\d"
promptHistoryNum="!"
promptCmdNum="#"
promptRootOrUser="$"
promptLastExit="?"

u="\u"
h="\h"
H="\H"
dir="\W"
dirFull="\w"
t24="\t"
t12="@"
t24full="\T"
date="\d"
historyNum="!"
cmdNum="#"
rootOrUser="$"
lastExit="?"
EOF
}


tetra_prompt_colors() {
    # Reset
    local NO_COLOR='\[\e[0m\]'


    local Red='\[\e[0;31m\]'
    local Green='\[\e[0;32m\]'
    local Yellow='\[\e[0;33m\]'
    local Blue='\[\e[0;34m\]'
    local Purple='\[\e[0;35m\]'
    local Cyan='\[\e[0;36m\]'
    local White='\[\e[0;37m\]'

    # Bold
    local BBlack='\[\e[1;30m\]'
    local BRed='\[\e[1;31m\]'
    local BGreen='\[\e[1;32m\]'
    local BYellow='\[\e[1;33m\]'
    local BBlue='\[\e[1;34m\]'
    local BPurple='\[\e[1;35m\]'
    local BCyan='\[\e[1;36m\]'
    local BWhite='\[\e[1;37m\]'

    # Background
    local On_Black='\[\e[40m\]'
    local On_Red='\[\e[41m\]'
    local On_Green='\[\e[42m\]'
    local On_Yellow='\[\e[43m\]'
    local On_Blue='\[\e[44m\]'
    local On_Purple='\[\e[45m\]'
    local On_Cyan='\[\e[46m\]'
    local On_White='\[\e[47m\]'

}

# The sequence `\[\e[0;38;5;228m\]` is an ANSI escape code that
# is used to customize the appearance of text in a terminal or a text-based
# interface. 

# 1. `\[\e` or `\e` - This is an escape character signal start of escape sequence.
#                     Also known as  `\033` or `\x1B`.

# 2. `0;38;5;228m` - This part of the sequence contains the actual commands:
#    - `0` - This is a reset code that returns all attributes to their defaults.
#    - `38` - This code indicates that the following instructions will set the foreground (text) color.
#    - `5` - This indicates that a specific color from a 256-color palette is being chosen.
#    - `228` - This is the index of the color within the 256-color palette, which in many standard palettes is a light yellow color.
#    - `m` - This marks the end of the color specification sequence.
#  
# 3. `\[` and `\]` - These are bash-specific markers tell shell not to take up physical space on the screen.
#    They are necessary to ensure that line-wrapping works properly and are used to mark non-printing characters.

# Putting it all together, the escape sequence `\[\e[0;38;5;228m\]`
# tells the terminal to set the foreground text color to a specific
# shade of light yellow on supported text interfaces, and does so in a
# way that doesn't mess up bash's understanding of line length and cursor
# positions. If you're setting up your prompt (PS1) in a shell or scripting
# color output, you can use this sequence to change text colors.
# fmt: cannot open '65' for reading: No such file or directory
