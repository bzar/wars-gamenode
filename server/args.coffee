findIndex = (l, p) ->
  for e, i in l
    return i if p(e)
  return null

find = (l, p) ->
  i = findIndex(l, p)
  return if i isnt null then l[i] else null

any = (l, p) -> find(l, p) isnt null
all = (l, p) -> find(l, (i) -> not p(i)) is null

require = (args) -> return all args, (a) -> a?
check = (a, p) -> if p then a else null
number = (a) -> check a, a instanceof Number
integer = (a) -> check a, number(a) and parseInt(a) is a
string = (a) -> check a, a instanceof String
list = (a, p) -> check a, a instanceof Array and (not p? or all(a, p))

exports.require = require