# -*- coding: utf-8 -*-
"""
Created on Thu Sep 26 19:50:14 2019

@author: mayan
"""

import requests
import json
import numpy as np
import base64
import sys
from flask import Flask, render_template, redirect, url_for,request
from flask import make_response
import png
app = Flask(__name__)

# command to run server: 
# python -m netdissect.server --address 0.0.0.0

def get_generated_image(image_id, feature, bitstring):
    base64_grayscale_png = convertBinaryStrToBase64(bitstring)
    project = "churchoutdoor_lsun"
    
    r = requests.get("http://34.74.168.113:5001/api/all_projects")
    get_all_projects_response = r.json()
    
    project_json = get_all_projects_response[0]
    layers = project_json['info']['layers']
    layer = layers[1]
    
    r = requests.get("http://34.74.168.113:5001/api/rankings?project=%s&layer=%s"%(project, layer))
    get_rankings_response = r.json()
    
    get_rankings_response_list = get_rankings_response['res']
    
    for metric_json in get_rankings_response_list:
        if metric_json['metric'] == 'iou':
            if metric_json['name'] == feature+'-iou':
                list_of_feature_scores = metric_json['scores']
                
    number_of_units = 10
    # get lowest-ranked units (since everything is negative)
    min_rankings = []
    min_indices = []
    for i in range(len(list_of_feature_scores)):
        elem = list_of_feature_scores[i]
        if len(min_indices) < number_of_units:
            min_rankings.append(elem)
            min_indices.append(i)
        elif elem < max(min_rankings):
            replace_index = np.argmax(min_rankings)
            min_rankings[replace_index] = elem
            min_indices[replace_index] = i
    
    quantile = .99
    r = requests.get("http://34.74.168.113:5001/api/levels?project=%s&layer=%s&quantiles=%f"%(project, layer, quantile))
    get_levels_response = r.json()
    
    # get abalation value for each of the highest-scored units
    get_levels_response_list = get_levels_response['res']
    max_levels = []
    for index in min_indices:
        max_levels.append(get_levels_response_list[index][0])
    
    # construct abalations
    abalations = []
    for i in range(len(min_indices)):
        unit = min_indices[i]
        level = max_levels[i]
        abalation_dict = {"alpha": 1, "layer": layer, "unit": unit, "value": level}
        abalations.append(abalation_dict)
    
    post_request = {
            
      # image ids we're interested in
      "ids": [
        image_id
      ],
              
      "interventions": [
        {
          # abalations describe which units and values to use to 
          # change that area
          "ablations": abalations,
          
          # maskalpha describes the path that the user selected
          # to change
          "mask": {
            "bitbounds": [],
            "bitstring": "data:image/png;base64,"+base64_grayscale_png,
            "shape": []
          },
        }
      ],
      "project": project,
      "return_urls": 0,
    }
        
    # formulate post request
    url = "http://34.74.168.113:5001/api/generate"
    headers = {'Content-type': 'application/json', 'Accept': 'text/html'}
    r = requests.post(url, data=json.dumps(post_request), headers=headers)
    results_dict = json.loads(r.text)
    return results_dict['res'][0]['d']

def convert_post_result_to_jpg(datastring, filename):
    split_data = datastring.split(",")
    imgstring = split_data[1]
    imgdata = base64.b64decode(imgstring)
    filename = filename+'.jpg'  # I assume you have a way of picking unique filenames
    with open(filename, 'wb') as f:
        f.write(imgdata)
        f.close()

def convertBinaryStrToBase64(bin_string):
    rgb_arr = []
    index = 0
    for r in range(256):
        row = []
        for c in range(256):
            bit = bin_string[index]
            index += 1
            if bit == '0':
                row.append(255)
                row.append(255)
                row.append(255)
            elif bit == '1':
                #rgb_arr.append((240, 96, 105))
                row.append(11)
                row.append(198)
                row.append(212)
        rgb_arr.append(row)
    img = png.from_array(rgb_arr, 'RGB', info={"height":256, "width":256})
    img.save("selected_pixels.png")
    with open("selected_pixels.png", "rb") as img_file:
        my_string = base64.b64encode(img_file.read())
    return str(my_string.decode('utf-8'))
        
def apply_feature_to_image(image_id, feature, application_bitstring):
    
    
    datastring = get_generated_image(image_id, feature, application_bitstring)
    filename = '../media/extensions/ganpaint_images/church'
    convert_post_result_to_jpg(datastring, filename)


# This class contains methods to handle our requests to different URIs in the app
#class MyHandler(SimpleHTTPRequestHandler):
#    def do_HEAD(self):
#        self.send_response(200)
#        self.send_header('Content-type', 'text/html')
#        self.end_headers()
#                                     
#    # Check the URI of the request to serve the proper content.
#    def do_GET(self):
#        if "URLToTriggerGetRequestHandler" in self.path:
#            # If URI contains URLToTriggerGetRequestHandler, execute the python script that corresponds to it and get that data
#            # whatever we send to "respond" as an argument will be sent back to client
#            content = pythonScriptMethod()
#            self.respond(content) # we can retrieve response within this scope and then pass info to self.respond
#        else:
#            super(MyHandler, self).do_GET() #serves the static src file by default
#
#    def handle_http(self, data):
#        self.send_response(200)
#        # set the data type for the response header. In this case it will be json.
#        # setting these headers is important for the browser to know what  to do with
#        # the response. Browsers can be very picky this way.
#        self.send_header('Content-type', 'application/json')
#        self.end_headers()
#        return bytes(data, 'UTF-8')
#    
#    # store response for delivery back to client. This is good to do so
#    # the user has a way of knowing what the server's response was.
#    def respond(self, data):
#        response = self.handle_http(data)
#        self.wfile.write(response)
#                                                                                                                    # This is the main method that will fire off the server. 
#if __name__ == '__main__':
#    server_class = HTTPServer
#    httpd = server_class((HOST_NAME, PORT_NUMBER), MyHandler)
#    print(time.asctime(), 'Server Starts - %s:%s' % (HOST_NAME, PORT_NUMBER))
#    try:
#        httpd.serve_forever()
#    except KeyboardInterrupt:
#        pass
#    httpd.server_close()
#    print(time.asctime(), 'Server Stops - %s:%s' % (HOST_NAME, PORT_NUMBER))

def getImgId(num):
    img_ids = [104, 425, 457, 489, 495, 570, 584, 644, 700, 705, 719, 726, 816, 1085, 1146, 1362]
    return img_ids[num]

@app.route("/")
def home():
    return "hi"
@app.route("/index")

@app.route('/ganpaint', methods=['GET', 'POST'])
def login():
    message = None
    if request.method == 'POST':
        img_addr = request.form['addr']
        img_name = img_addr.split("/")[-1]
        img_id = int(img_name.replace("church","").replace(".jpg",""))
        feature = request.form['feature']
        base64_grayscale_png = request.form['bitstring']
        apply_feature_to_image(getImgId(img_id), feature, base64_grayscale_png)

        result = 'Image has been updated successfully.'
        resp = make_response('{"response": '+result+'}')
        resp.headers['Content-Type'] = "application/json"
        resp.headers['Access-Control-Allow-Origin'] = "*"
        return resp
        return render_template('login.html', message='')

if __name__ == "__main__":
    app.run(host='0.0.0.0' , port=5000, debug = True)
    #apply_feature_to_image(13, "grass", "1000100010001000")

#-----------------------------------------------------------------
#TEST DATA

#base64_grayscale_png = "00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000000000000000000000000 \
#00000000000001000000000000000000 \
#00000000000011100000000000000000 \
#00000000000011111100000000000000 \
#00000000000011111110000000000000 \
#00000000000011111110000000000000 \
#00000000000011111110000000000000 \
#00000000000111111110000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000 \
#00000000000111111100000000000000"
#img_id = 13
#feature = "building"
#-----------------------------------------------------------------
    

