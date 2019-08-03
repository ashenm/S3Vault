#!/usr/bin/env python3

from sys import argv
from os import getcwd
from os.path import join, isfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, test

class VautlRequestHandler(SimpleHTTPRequestHandler):

  def __init__(self, *args, index='vault.html', **kwargs):
    self.root = join(getcwd(), 'dist')
    self.index = join(self.root, index)
    super().__init__(*args, **kwargs)

  def translate_path(self, path):
    print(path)
    if isfile(join(self.root, path.lstrip('/'))):
      return join(self.root, path.lstrip('/'))
    return self.index

if __name__ == '__main__':

  test(HandlerClass=partial(VautlRequestHandler,
    index=dict(enumerate(argv)).get(2, 'vault.html')),
    port=int(dict(enumerate(argv)).get(1, '8080'))
  )

# vim: set expandtab shiftwidth=2 syntax=python:
