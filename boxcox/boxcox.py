import numpy as np
import scipy
import matplotlib.pyplot as plt
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'
