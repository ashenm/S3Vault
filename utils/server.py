#!/usr/bin/env python3

from sys import argv
from os.path import isfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, test

class VautlRequestHandler(SimpleHTTPRequestHandler):
    
    def __init__(self, *args, index='vault.html', **kwargs):
        self.index = index
        super().__init__(*args, **kwargs)

    def translate_path(self, path):
        print(path)
        if isfile(path.lstrip('/')):
            return path.lstrip('/')
        return self.index

if __name__ == '__main__':
    test(HandlerClass=partial(VautlRequestHandler,
        index=dict(enumerate(argv)).get(2, 'vault.html')),
        port=int(dict(enumerate(argv)).get(1, '8080'))
    )
