-- Fixes for macOS/Lua 5.4 + robust nonblocking FIFO read + TTY-safe key input

local posix = require("posix")

-- ---------- config ----------
local PATH           = arg[1] or "/tmp/scope.fifo"
local MAX_CH         = 4
local REFRESH_HZ     = 30
local HIST_SEC       = 2.0
local DEFAULT_SPAN   = 0.250
local STACK_FRAC     = 0.45
local TRIG_POS_FRAC  = 0.25
local DIGITAL_LAST   = false

-- ---------- state ----------
local chans = {}
for i=1,MAX_CH do
  chans[i] = {visible=true, gain=1.0, offset=0.0}
end
local buf = {}
local buf_head = 0
local last_t = nil

local run = true
local time_span = DEFAULT_SPAN
local auto_span = true
local trig_enabled = false
local trig_ch = 1
local trig_lvl = 0.0
local trig_edge = 1
local trig_hyst = 1e-9
local use_envelope = true

local fd, ttyfd
local is_stdin = (PATH == "-" or PATH == "/dev/stdin")
local partial = ""   -- carry for split lines

-- ---------- term ----------
local function term_raw()
  -- macOS: stty -f /dev/tty; Linux: stty < /dev/tty
  if posix.uname().sysname == "Darwin" then
    os.execute("stty -f /dev/tty -icanon -echo min 0 time 0")
  else
    os.execute("stty -icanon -echo min 0 time 0 < /dev/tty")
  end
end
local function term_restore()
  if posix.uname().sysname == "Darwin" then
    os.execute("stty -f /dev/tty sane")
  else
    os.execute("stty sane < /dev/tty")
  end
end
local function cls() io.write("\27[2J") end
local function cup(r,c) io.write(string.format("\27[%d;%dH", r, c)) end
local function hide() io.write("\27[?25l") end
local function show() io.write("\27[?25h") end
local function rev(on) if on then io.write("\27[7m") else io.write("\27[27m") end end

-- ---------- util ----------
local function now()
  local ts = posix.clock_gettime("monotonic")
  return ts.tv_sec + ts.tv_nsec*1e-9
end
local function sleep(s) posix.nanosleep(s) end
local function split_ws(s)
  local t = {}
  for tok in string.gmatch(s, "%S+") do t[#t+1]=tok end
  return t
end
local function buf_push(t, vs) buf_head=buf_head+1; buf[buf_head]={t,vs} end
local function buf_trim(cut_t)
  local i=1
  while i<=buf_head and buf[i][1] < cut_t do buf[i]=nil; i=i+1 end
  if i>1 then
    local j=1
    for k=i,buf_head do buf[j]=buf[k]; buf[k]=nil; j=j+1 end
    buf_head=j-1
  end
end

-- ---------- IO ----------
local function open_tty()
  -- open /dev/tty for key input regardless of stdin source
  ttyfd = posix.open("/dev/tty", posix.O_RDONLY)
  if ttyfd then
    local fl = posix.fcntl(ttyfd, posix.F_GETFL)
    posix.fcntl(ttyfd, posix.F_SETFL, fl | posix.O_NONBLOCK) -- Lua 5.3+ bitwise |
  end
end

local function open_input()
  if is_stdin then
    fd = posix.fileno(io.stdin)
    local flags = posix.fcntl(fd, posix.F_GETFL)
    posix.fcntl(fd, posix.F_SETFL, flags | posix.O_NONBLOCK)
    return
  end
  local st = posix.stat(PATH)
  if not st then
    io.stderr:write("FIFO not found: ", PATH, " (mkfifo ", PATH, ")\n"); os.exit(1)
  end
  fd = posix.open(PATH, posix.O_RDONLY | posix.O_NONBLOCK)
end

local function parse_line(line)
  local parts = split_ws(line)
  if #parts < 2 then return nil end
  local t = tonumber(parts[1]); if not t then return nil end
  local vs = {}
  for i=2, math.min(1+MAX_CH, #parts) do
    vs[#vs+1] = tonumber(parts[i]) or 0.0
  end
  return t, vs
end

local function feed_data_chunk(chunk)
  partial = partial .. chunk
  local start = 1
  while true do
    local nl = string.find(partial, "\n", start, true)
    if not nl then
      -- retain remainder starting at 'start'
      partial = string.sub(partial, start)
      return
    end
    local line = string.sub(partial, start, nl-1)
    start = nl + 1
    if #line > 0 then
      local t, vs = parse_line(line)
      if t then
        if last_t and t < last_t then t = last_t + 1e-12 end
        last_t = t
        buf_push(t, vs)
      end
    end
  end
end

local function read_into_buffer()
  if not fd then return 0 end
  local rset = {[fd]=true}
  local rdy = {posix.select(rset, nil, nil, 0)}
  -- luaposix returns three tables; first is rset (possibly mutated)
  local rr = rdy[1]
  local n = 0
  if rr and rr[fd] then
    local data = posix.read(fd, 65536) or ""
    if #data == 0 then
      if not is_stdin then posix.close(fd); sleep(0.01); open_input() end
    else
      feed_data_chunk(data)
    end
  end
  if last_t then
    local cutoff = last_t - math.max(HIST_SEC, 5*DEFAULT_SPAN)
    buf_trim(cutoff)
    n = 1
  end
  return n
end

-- ---------- window ----------
local function estimate_dt()
  if buf_head < 5 then return nil end
  local a = math.max(1, buf_head - 200)
  local prev, n = nil, 0
  local dts = {}
  for i=a,buf_head do
    local t = buf[i][1]
    if prev and t>prev then dts[#dts+1] = t - prev end
    prev = t
  end
  if #dts == 0 then return nil end
  table.sort(dts)
  return dts[math.floor(#dts/2)+1]
end

local function compute_window(cols)
  if buf_head == 0 then
    local t = now()
    return t - time_span, t
  end
  if auto_span and buf_head > 2 then
    local dt = estimate_dt()
    if dt then
      local target_cols = math.max(10, math.floor(0.8*math.max(2, cols)))
      local span = math.max(5*dt, target_cols*dt)
      time_span = math.max(0.005, math.min(60.0, span))
    end
  end
  local right = buf[buf_head][1]
  return right - time_span, right
end

-- ---------- mapping/render ----------
local function map_row(val, rows, ci)
  local sep = rows / (MAX_CH + 1)
  local mid = math.floor(ci*sep + sep)
  local scale = sep * STACK_FRAC
  local y = math.floor(mid - val*scale + 0.5)
  if y < 2 then y = 2 end
  if y > rows then y = rows end
  return y
end

local function header_line(cols)
  local run_s = run and "ON" or "OFF"
  local edge_s = (trig_edge>0 and "+") or (trig_edge<0 and "-") or "+/-"
  return string.format("[q] quit  [space] run=%s  [</>] span=%.3fs  [m] auto=%s  [t] trig=%s ch=%d lvl=%+.3g edge=%s  [o] env/pts",
    run_s, time_span, (auto_span and "ON" or "OFF"), (trig_enabled and "ON" or "OFF"), trig_ch, trig_lvl, edge_s)
end

local function draw_frame(rows, cols, left_t, right_t)
  cup(1,1); rev(true)
  local hl = header_line(cols)
  io.write(hl); if #hl < cols then io.write(string.rep(" ", cols-#hl)) end
  rev(false)
  for y=2,rows do cup(y,1); io.write("|") end
  cup(rows+1,1); io.write("+" .. string.rep("-", cols-2) .. ">")
  local span = math.max(1e-12, right_t - left_t)

  if use_envelope then
    for ci=1,MAX_CH do
      if chans[ci].visible then
        local ymin, ymax = {}, {}
        for i=1,buf_head do
          local t,vs = buf[i][1], buf[i][2]
          if t >= left_t and t <= right_t and #vs >= ci then
            local xf = (cols-3) * (t - left_t) / span
            local x = 2 + math.floor(xf + 0.5)
            if x >= 2 and x <= cols-1 then
              local yv = chans[ci].gain*vs[ci] + chans[ci].offset
              if DIGITAL_LAST and ci==MAX_CH then yv = (yv>=0.5) and 0.8 or -0.8 end
              local y = map_row(yv, rows-1, ci)
              ymin[x] = (ymin[x] and math.min(ymin[x], y)) or y
              ymax[x] = (ymax[x] and math.max(ymax[x], y)) or y
            end
          end
        end
        for x=2,cols-1 do
          local y0, y1 = ymin[x], ymax[x]
          if y0 then for y=y0,y1 do cup(y,x); io.write("|") end end
        end
      end
    end
  else
    for ci=1,MAX_CH do
      if chans[ci].visible then
        local lastx, lasty = nil, nil
        for i=1,buf_head do
          local t,vs = buf[i][1], buf[i][2]
          if t >= left_t and t <= right_t and #vs >= ci then
            local xf = 1 + (cols-2) * (t - left_t) / span
            local x = math.floor(xf + 0.5)
            if x >= 2 and x <= cols-1 then
              local yv = chans[ci].gain*vs[ci] + chans[ci].offset
              if DIGITAL_LAST and ci==MAX_CH then yv = (yv>=0.5) and 0.8 or -0.8 end
              local y = map_row(yv, rows-1, ci)
              cup(y,x); io.write("*")
              if lastx and x>lastx then
                local dx, dy = x-lastx, y-lasty
                for k=1,dx-1 do
                  local xi = lastx + k
                  local yi = lasty + math.floor(dy*k/dx + 0.5)
                  if xi>=2 and xi<=cols-1 and yi>=2 and yi<=rows-1 then cup(yi,xi); io.write(".") end
                end
              end
              lastx, lasty = x, y
            end
          end
        end
      end
    end
  end

  cup(rows,3)
  local meta = {}
  for i=1,MAX_CH do
    local ch = chans[i]
    meta[#meta+1] = string.format("ch%d:%s g=%.3g off=%+.3g", i, ch.visible and "on" or "off", ch.gain, ch.offset)
  end
  io.write(table.concat(meta, "  "))
end

-- ---------- keys ----------
local function read_key()
  if not ttyfd then return nil end
  local rset = {[ttyfd]=true}
  local rdy = {posix.select(rset,nil,nil,0)}
  local rr = rdy[1]
  if rr and rr[ttyfd] then
    local c = posix.read(ttyfd, 1)
    if c and #c>0 then return c end
  end
  return nil
end

local function handle_key(c)
  if not c then return end
  local b = string.byte(c)
  if c == "q" or b == 27 then return "quit" end
  if c == " " then run = not run end
  if c == ">" or c == "." then time_span = math.min(60.0, time_span*1.25) end
  if c == "<" or c == "," then time_span = math.max(0.005, time_span/1.25) end
  if c == "m" then auto_span = not auto_span end
  if c == "t" then trig_enabled = not trig_enabled end
  if c == "g" then trig_ch = (trig_ch % MAX_CH) + 1 end
  if c == "+" or c == "=" then trig_lvl = trig_lvl + 0.05 end
  if c == "-" then trig_lvl = trig_lvl - 0.05 end
  if c == "r" then trig_edge = 1 end
  if c == "f" then trig_edge = -1 end
  if c == "e" then trig_edge = 0 end
  if c == "o" then use_envelope = not use_envelope end
  if c >= "1" and c <= "4" then
    local i = string.byte(c) - string.byte("0")
    chans[i].visible = not chans[i].visible
  end
  if c == "a" or c == "A" then chans[1].gain = chans[1].gain * (c=="A" and 1.1 or 1/1.1) end
  if c == "s" or c == "S" then chans[2].gain = chans[2].gain * (c=="S" and 1.1 or 1/1.1) end
  if c == "d" or c == "D" then chans[3].gain = chans[3].gain * (c=="D" and 1.1 or 1/1.1) end
  if c == "f" or c == "F" then chans[4].gain = chans[4].gain * (c=="F" and 1.1 or 1/1.1) end
  if c == "z" or c == "Z" then chans[1].offset = chans[1].offset + (c=="Z" and 0.05 or -0.05) end
  if c == "x" or c == "X" then chans[2].offset = chans[2].offset + (c=="X" and 0.05 or -0.05) end
  if c == "c" or c == "C" then chans[3].offset = chans[3].offset + (c=="C" and 0.05 or -0.05) end
  if c == "v" or c == "V" then chans[4].offset = chans[4].offset + (c=="V" and 0.05 or -0.05) end
end

-- ---------- main loop ----------
local function main()
  open_input()
  open_tty()
  io.stdout:setvbuf("no")
  term_raw(); hide()

  local rows, cols = 0, 0
  local function get_size()
    local ok, ws = pcall(posix.tcgetwinsize, 1)
    if ok and ws and ws.ws_row and ws.ws_col then
      rows, cols = ws.ws_row-2, ws.ws_col
    else
      rows = (tonumber(os.getenv("LINES")) or 24) - 2
      cols = tonumber(os.getenv("COLUMNS")) or 80
    end
    if rows < 10 then rows = 10 end
    if cols < 40 then cols = 80 end
  end

  local frame_dt = 1.0/REFRESH_HZ
  while true do
    get_size()
    if run then read_into_buffer() end
    cls()
    local left_t, right_t = compute_window(cols)
    if right_t <= left_t then right_t = left_t + 1e-3 end
    draw_frame(rows, cols, left_t, right_t)
    local k = read_key()
    if handle_key(k) == "quit" then break end
    sleep(frame_dt)
  end
  show(); term_restore(); cup(rows+3,1)
end

posix.signal(posix.SIGINT, function() show(); term_restore(); os.exit(0) end)
main()
