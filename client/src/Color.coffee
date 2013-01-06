define [], ->

  ###
  Converts an RGB color value to HSL. Conversion formula
  adapted from http://en.wikipedia.org/wiki/HSL_color_space.
  Assumes r, g, and b are contained in the set [0, 255] and
  returns h, s, and l in the set [0, 1].

  @param   Number  r       The red color value
  @param   Number  g       The green color value
  @param   Number  b       The blue color value
  @return  Array           The HSL representation
  ###
  rgbToHsl = (r, g, b) ->
    r /= 255
    g /= 255
    b /= 255
    max = Math.max(r, g, b)
    min = Math.min(r, g, b)
    h = (max + min) / 2
    s = h
    l = h

    if max == min
      h = s = 0; # achromatic
    else
      d = max - min
      s = if l > 0.5 then d / (2 - max - min) else d / (max + min)
      switch max
        when r then h = (g - b) / d + (g < b ? 6 : 0)
        when g then h = (b - r) / d + 2
        when b then h = (r - g) / d + 4
      
      h /= 6

    return [h, s, l]


  ###
  Converts an HSL color value to RGB. Conversion formula
  adapted from http://en.wikipedia.org/wiki/HSL_color_space.
  Assumes h, s, and l are contained in the set [0, 1] and
  returns r, g, and b in the set [0, 255].

  @param   Number  h       The hue
  @param   Number  s       The saturation
  @param   Number  l       The lightness
  @return  Array           The RGB representation
  ###
  hslToRgb = (h, s, l) ->
    r = null
    g = null
    b = null

    if s == 0
      r = g = b = l # achromatic
    else
      hue2rgb = (p, q, t) ->
        if t < 0 then t += 1
        else if t > 1 then t -= 1
        
        if t < 1/6 then p + (q - p) * 6 * t
        else if t < 1/2 then q
        else if t < 2/3 then p + (q - p) * (2/3 - t) * 6
        else p

      q = if l < 0.5 then l * (1 + s) else l + s - l * s
      p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]


  ###
  Converts an RGB color value to HSV. Conversion formula
  adapted from http://en.wikipedia.org/wiki/HSV_color_space.
  Assumes r, g, and b are contained in the set [0, 255] and
  returns h, s, and v in the set [0, 1].

  @param   Number  r       The red color value
  @param   Number  g       The green color value
  @param   Number  b       The blue color value
  @return  Array           The HSV representation
  ###
  rgbToHsv = (r, g, b) ->
    r /= 255
    g /= 255
    b /= 255
    max = Math.max(r, g, b)
    min = Math.min(r, g, b)
    h = max
    s = max
    v = max

    d = max - min
    s = if max == 0 then 0 else d / max

    if max == min
      h = 0; # achromatic
    else
      switch max
        when r then h = (g - b) / d + (if g < b then 6 else 0)
        when g then h = (b - r) / d + 2
        when b then h = (r - g) / d + 4
    
      h /= 6

    return [h, s, v]


  ###
  Converts an HSV color value to RGB. Conversion formula
  adapted from http://en.wikipedia.org/wiki/HSV_color_space.
  Assumes h, s, and v are contained in the set [0, 1] and
  returns r, g, and b in the set [0, 255].

  @param   Number  h       The hue
  @param   Number  s       The saturation
  @param   Number  v       The value
  @return  Array           The RGB representation
  ###
  hsvToRgb = (h, s, v) ->
    r = null
    g = null
    b = null

    i = Math.floor(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)

    switch i % 6
      when 0
        r = v
        g = t
        b = p
      when 1
        r = q
        g = v
        b = p
      when 2
        r = p
        g = v
        b = t
      when 3
        r = p
        g = q
        b = v
      when 4
        r = t
        g = p
        b = v
      when 5
        r = v
        g = p
        b = q

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]

  append = (l, v) ->
    l.push v
    return l
  
  class Color 
    constructor: (@r, @g, @b, @a = 1) ->
    toRgb: -> [@r, @g, @b]
    toRgba: -> [@r, @g, @b, @a]
    toHsl: -> rgbToHsl(@r, @g, @b)
    toHsla: -> append rgbToHsl(@r, @g, @b) @a
    toHsv: -> rgbToHsv(@r, @g, @b)
    toHsva: -> append rgbToHsv(@r, @g, @b) @a
    toString: -> "rgba(#{ @r }, #{ @g }, #{ @b }, #{ @a })"

  Color.fromRgba = (r, g, b, a) -> new Color(r, g, b, a)
  Color.fromRgb = (r, g, b) -> new Color(r, g, b)
  Color.fromHsla = (h, s, l, a) -> new Color(append(hslToRgb(h, s, l), a)...)
  Color.fromHsl = (h, s, l) -> Color.fromHsla(h, s, l, 1)
  Color.fromHsva = (h, s, v, a) -> new Color(append(hsvToRgb(h, s, v), a)...)
  Color.fromHsv = (h, s, v) -> Color.fromHsva(h, s, v, 1)
  
  return Color
