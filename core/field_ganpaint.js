/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2019 Massachusetts Institute of Technology
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview GAN Paint Editor.
 * Displays the GAN Paint editor, and (once this functionality is added) communicates with the GAN Paint server to do so. 
 * @author Philip Tegmark
 */
'use strict';

goog.provide('Blockly.FieldGANPaint');

goog.require('Blockly.DropDownDiv');

/**
 * Class for a ganpaint field.
 * @extends {Blockly.Field}
 * @constructor
 */
Blockly.FieldGANPaint = function() {
  Blockly.FieldGANPaint.superClass_.constructor.call(this);
  this.addArgType('ganpaint');
  /**
   * Array of SVGElement<rect> used to make the GAN Paint buttons in the dropdown menu.
   * @type {!Array<SVGElement>}
   * @private
   */
  this.textButtons_ = [];
  /**
   * The left-most of the 3 main SVG elements. It contains the brush, operation, undo, and reset buttons 
   (the text buttons). 
   * @type {?SVGElement}
   * @private
   */
  this.textButtonStage_ = null;
  /**
   * The middle one of the 3 main SVG elements. It contains the main image. 
   * @type {?SVGElement}
   * @private
   */
  this.mainImageStage_ = null;
  /**
   * The right-most of the 3 main SVG elements. It contains the church selection buttons. 
   * @type {?SVGElement}
   * @private
   */
  this.churchButtonStage_ = null;
  /**
   * Array to store the points in the main image that the mouse dragged over between 
   mousedown and mouseup events. 
   * @type {!Array}
   * @private
   */
  this.selectedPoints_ = null;
  /**
   * A big array of smaller arrays to store the locations of all the text buttons. 
   Each smaller array corresponds to one button, and its 4 elements are: the x 
   position within the SVG, y position within the SVG, width, and height of the rect element used to 
   create the button, in that order. 
   * @type {!Array}
   * @private
   */
  this.textButtonLocations_ = null;
  /**
   * A big array of smaller arrays to store the locations of the church selection buttons. 
   Each smaller array corresponds to one button, and its 2 elements are: the button's x position within the 
   SVG, and the button's y position within the SVG, in that order. 
   * @type {!Array}
   * @private
   */
  this.churchButtonLocations_ = null;
  /**
   * String to record which brush the user is currently using. Its possible values are: 'tree', 'grass', 
   'door', 'sky', 'cloud', 'brick', and 'dome'. 
   * @type {String}
   * @private
   */
  this.brushState_ = 'tree';
  /**
   * String to record whether the user is currently drawing or removing from the main image. This string's 
   possible values are 'draw' and 'remove'. 
   * @type {String}
   * @private
   */
  this.drawingState_ = 'draw';
  /**
   * The SVG image that is the main image in the GAN Paint editor. This is the image that is being 
   edited by the user. 
   * @type {?SVGElement}
   * @private
   */
  this.mainImage_ = null;
  /**
   * The SVG image that is the dropdown menu's thumbnail. 
   * @type {?SVGElement}
   * @private
   */
  this.thumbnailImage_ = null;
  /**
   * String recording the address of the file used as the source of the main image. 
   * @type {String}
   * @private
   */
  this.mainImageAddress_ = Blockly.mainWorkspace.options.pathToMedia + 'extensions/ganpaint_images/church0.jpg';
  /**
   * String recording the address of the original version of the image currently being 
   edited. Used to reset the main image when the reset button is clicked. 
   * @type {String}
   * @private
   */
  this.originalImageAddress_ = this.mainImageAddress_;
  /**
   * SVG image for dropdown arrow.
   * @type {?SVGElement}
   * @private
   */
  this.arrow_ = null;
  /**
   * Touch event wrapper. 
   * Runs when the field is selected. 
   * @type {!Array}
   * @private
   */
  this.mouseDownWrapper_ = null;
  /**
   * mousedown event wrapper.
   * Runs when the this.mainImageStage_ is first clicked. 
   * @type {!Array}
   * @private
   */
  this.mainImageTouchWrapper_ = null;
  /**
   * mousemove event wrapper.
   * Runs when the user drags the mouse across this.mainImageStage_. 
   * @type {!Array}
   * @private
   */
  this.mainImageMoveWrapper_ = null;
  /**
   * mouseup event wrapper. 
   * Runs when this.mainImageStage_ is released (when it is no longer being clicked). 
   * @type {!Array}
   * @private
   */
  this.mainImageReleaseWrapper_ = null;
  /**
   * Click event wrapper.
   * Runs when this.textButtonStage_ (i.e. the text buttons) is clicked.
   * @type {!Array}
   * @private
   */
  this.textButtonClickWrapper_ = null;
  /**
   * Click event wrapper.
   * Runs when this.churchButtonStage_ (i.e. the church selection buttons) is clicked.
   * @type {!Array}
   * @private
   */
  this.churchButtonClickWrapper_ = null;
  /**
   * Drag event wrapper.
   * Runs when the main image is dragged. Used to prevent image dragging. 
   * @type {!Array}
   * @private
   */
  this.mainImageWrapper_ = null;
};

goog.inherits(Blockly.FieldGANPaint, Blockly.Field);

/**
 * Construct a FieldGANPaint from a JSON arg object.
 * @param {!Object} options A JSON object with options (ganpaint).
 * @returns {!Blockly.FieldGANPaint} The new field instance.
 * @package
 * @nocollapse
 */
Blockly.FieldGANPaint.fromJson = function(options) {          // Not sure what this does. 
  return new Blockly.FieldGANPaint(options['ganpaint']);
};

/**
 * Fixed size of the thumbnail in the input field, in px. 
 * @type {number}
 * @const
 */
Blockly.FieldGANPaint.THUMBNAIL_SIZE = 26;

/**
 * Fixed size of arrow icon in drop down menu, in px. 
 * @type {number}
 * @const
 */
Blockly.FieldGANPaint.ARROW_SIZE = 12;

/**
 * Fixed corner radius buttons, in px. 
 * @type {number}
 * @const
 */
Blockly.FieldGANPaint.BUTTON_RADIUS = 4;

/**
  Text button height in pixels. 
  @type {number}
  @const
*/
Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT = 18;

/**
  Width of the 7 brush selection buttons, in pixels. 
  @type {number}
  @const
*/
Blockly.FieldGANPaint.BRUSH_BUTTON_WIDTH = 80;

/**
  Number of pixels of space between adjacent buttons. 
  @type {number}
  @const
*/
Blockly.FieldGANPaint.BUTTON_PAD = 4;

/**
  Array containing the text fields of all brush buttons. 
  @type {array}
  @const
*/
Blockly.FieldGANPaint.BRUSH_STATES = ['tree', 'grass', 'door', 'sky', 'cloud', 'brick', 'dome'];

/**
  The height and width of the main image, in pixels. 
  @type {array}
  @const
*/
Blockly.FieldGANPaint.MAIN_IMAGE_SIZE = 256;

/**
  The height and width of the church selection buttons, in pixels. 
  @type {number}
  @const
*/
Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE = 32;

/**
 * Called when the field is placed on a block.
 * @param {Block} block The owning block.
 */
Blockly.FieldGANPaint.prototype.init = function() {
  if (this.fieldGroup_) {
    // Matrix menu has already been initialized once. 
    return;
  }

  // Build the DOM.
  this.fieldGroup_ = Blockly.utils.createSvgElement('g', {}, null);
  this.size_.width = Blockly.FieldGANPaint.THUMBNAIL_SIZE +
    Blockly.FieldGANPaint.ARROW_SIZE + (Blockly.BlockSvg.DROPDOWN_ARROW_PADDING * 1.5);

  this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);

  var thumbX = Blockly.BlockSvg.DROPDOWN_ARROW_PADDING / 2;
  var thumbY = (this.size_.height - Blockly.FieldGANPaint.THUMBNAIL_SIZE) / 2;
  var thumbnail = Blockly.utils.createSvgElement('g', {
    'transform': 'translate(' + thumbX + ', ' + thumbY + ')',
    'pointer-events': 'bounding-box', 'cursor': 'pointer'
  }, this.fieldGroup_);

  var attr = {
    'x': '0px',
    'y': '0px',
    'width': Blockly.FieldGANPaint.THUMBNAIL_SIZE,
    'height': Blockly.FieldGANPaint.THUMBNAIL_SIZE,
    'href': this.mainImageAddress_
  }
  this.thumbnailImage_ = Blockly.utils.createSvgElement('image', attr, thumbnail);

  if (!this.arrow_) {
    var arrowX = Blockly.FieldGANPaint.THUMBNAIL_SIZE +
      Blockly.BlockSvg.DROPDOWN_ARROW_PADDING * 1.5;
    var arrowY = (this.size_.height - Blockly.FieldGANPaint.ARROW_SIZE) / 2;
    this.arrow_ = Blockly.utils.createSvgElement('image', {
      'height': Blockly.FieldGANPaint.ARROW_SIZE + 'px',
      'width': Blockly.FieldGANPaint.ARROW_SIZE + 'px',
      'transform': 'translate(' + arrowX + ', ' + arrowY + ')'
    }, this.fieldGroup_);
    this.arrow_.setAttributeNS('http://www.w3.org/1999/xlink',
        'xlink:href', Blockly.mainWorkspace.options.pathToMedia +
        'dropdown-arrow.svg');
    this.arrow_.style.cursor = 'default';
  }

  this.mouseDownWrapper_ = Blockly.bindEventWithChecks_(
      this.getClickTarget_(), 'mousedown', this, this.onMouseDown_);
};

/**
 * Sets the main image and thumbnail to display the image at the address imageLocation. 
 Also fires a block change event. 

 This function may need to be changed to accommodate communication with the GAN Paint server. 
 Also, as of now, this function does not check if the new address specified by imageLocation is valid, 
 other than by checking if the value of imageLocation is falsy or not. This could be an issue. 

 * @param {string} imageLocation The URL of the new image. 
 * @override
 */
Blockly.FieldGANPaint.prototype.setValue = function(imageLocation) {
  if (!imageLocation || imageLocation === this.mainImageAddress_) {
    return;  // No change
  }
  if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
    Blockly.Events.fire(new Blockly.Events.Change(
        this.sourceBlock_, 'field', this.name, this.mainImageAddress_, imageLocation));
  }
  this.mainImageAddress_ = imageLocation;
  this.updateImage();
};

/**
 * Get the address of the current main image. 

 This function may need to be changed to accommodate communication with the GAN Paint server. 

 * @return {string} Current URL address of the main image. 
 */
Blockly.FieldGANPaint.prototype.getValue = function() {
  return this.mainImageAddress_;
};

/**
 * Show the drop-down menu for editing this field. Constructs the GAN Paint editor. 
 * @private
 */
Blockly.FieldGANPaint.prototype.showEditor_ = function() {
  // If there is an existing drop-down someone else owns, hide it immediately and clear it.
  Blockly.DropDownDiv.hideWithoutAnimation();
  Blockly.DropDownDiv.clearContent();
  var div = Blockly.DropDownDiv.getContentDiv();


  // ------ Build the SVG DOM: ------
  
  // ------ Create the text buttons: ------
  this.textButtonStage_ = Blockly.utils.createSvgElement('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'xmlns:html': 'http://www.w3.org/1999/xhtml',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'version': '1.1',
    'height': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE + 'px',
    'width': 100 + 'px',
    'fill': '#0DA57A'
  }, div);

  this.textButtonLocations_ = [];
  this.textButtons_ = [];
  this.churchButtonLocations_ = [];

  // Create the headers that say "Brush:" and "Operation:" 
  var attr = {                                      // Don't remove this declaration! 
    'x': '50%', 'y': '15px',
    'text-decoration': 'underline',
    'fill': '#FFFFFF',
    'font-family': '"Helvetica Neue", Helvetica, sans-serif',
    'font-size': '13px',
    'font-weight': '500',
    'text-anchor': 'middle'
  };
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('Brush:'));
  this.textButtonStage_.appendChild(newSvg);

  attr.y = '187px';
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('Operation:'));
  this.textButtonStage_.appendChild(newSvg);
  
  // Create the 7 brush buttons: 
  for (let i = 0; i < 7; i++) {
    var y = 19 + i * (Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT + Blockly.FieldGANPaint.BUTTON_PAD);
    attr = {
      'x': '10px', 'y': y + 'px',
      'width': Blockly.FieldGANPaint.BRUSH_BUTTON_WIDTH,
      'height': Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT,
      'rx': Blockly.FieldGANPaint.BUTTON_RADIUS,
      'ry': Blockly.FieldGANPaint.BUTTON_RADIUS
    };
    var brush_button = Blockly.utils.createSvgElement('rect', attr, this.textButtonStage_);
    
    this.textButtonLocations_.push([10, y, Blockly.FieldGANPaint.BRUSH_BUTTON_WIDTH, Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT]);
    this.textButtons_.push(brush_button);

    var y = 32 + i * (Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT + Blockly.FieldGANPaint.BUTTON_PAD);
    attr = {
      'x': '50%', 'y': y + 'px',
      'fill': '#FFFFFF',
      'font-family': '"Helvetica Neue", Helvetica, sans-serif',
      'font-size': '13px',
      'font-weight': '500',
      'text-anchor': 'middle'
    };
    var brush_button_text = Blockly.utils.createSvgElement('text', attr);

    var text_node = document.createTextNode(Blockly.FieldGANPaint.BRUSH_STATES[i]);
    brush_button_text.appendChild(text_node);

    this.textButtonStage_.appendChild(brush_button_text);
  }

  // Create the dividing lines: 
  attr = {
    'x1': "5px",
    'y1': "173px",
    'x2': "95px",
    'y2': "173px",
    'stroke': "#FFFFFF"
  };
  var newSvg = Blockly.utils.createSvgElement('line', attr, this.textButtonStage_);
  attr = {
    'x1': "5px",
    'y1': "213px",
    'x2': "95px",
    'y2': "213px",
    'stroke': "#FFFFFF"
  };
  var newSvg = Blockly.utils.createSvgElement('line', attr, this.textButtonStage_);

  // Create the remaining 4 buttons' rectangles: 
  attr = {
    'x': '6px', 'y': '191px',
    'width': '36px',
    'height': Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT,
    'rx': Blockly.FieldGANPaint.BUTTON_RADIUS,
    'ry': Blockly.FieldGANPaint.BUTTON_RADIUS,
  };
  var newSvg = Blockly.utils.createSvgElement('rect', attr, this.textButtonStage_);
  this.textButtons_.push(newSvg);
  this.textButtonLocations_.push([6, 191, 36, Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT]);
  
  attr = {
    'x': '46px', 'y': '191px',
    'width': '48px',
    'height': Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT,
    'rx': Blockly.FieldGANPaint.BUTTON_RADIUS,
    'ry': Blockly.FieldGANPaint.BUTTON_RADIUS,
  };
  var newSvg = Blockly.utils.createSvgElement('rect', attr, this.textButtonStage_);
  this.textButtons_.push(newSvg);
  this.textButtonLocations_.push([46, 191, 48, Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT]);

  attr = {
    'x': '8px', 'y': '218px',
    'width': '36px',
    'height': Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT,
    'rx': Blockly.FieldGANPaint.BUTTON_RADIUS,
    'ry': Blockly.FieldGANPaint.BUTTON_RADIUS,
  };
  var newSvg = Blockly.utils.createSvgElement('rect', attr, this.textButtonStage_);
  this.textButtons_.push(newSvg);
  this.textButtonLocations_.push([8, 218, 36, Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT]);

  attr = {
    'x': '50px', 'y': '218px',
    'width': '37px',
    'height': Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT,
    'rx': Blockly.FieldGANPaint.BUTTON_RADIUS,
    'ry': Blockly.FieldGANPaint.BUTTON_RADIUS,
  };
  var newSvg = Blockly.utils.createSvgElement('rect', attr, this.textButtonStage_);
  this.textButtons_.push(newSvg);
  this.textButtonLocations_.push([50, 218, 37, Blockly.FieldGANPaint.TEXT_BUTTON_HEIGHT]);

  // Create the remaining 4 buttons' text: 
  attr = {
    'x': '24%', 'y': '204px',
    'fill': '#FFFFFF',
    'font-family': '"Helvetica Neue", Helvetica, sans-serif',
    'font-size': '13px',
    'font-weight': '500',
    'text-anchor': 'middle'
  };
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('draw'));
  this.textButtonStage_.appendChild(newSvg);

  attr.x = '70%';
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('remove'));
  this.textButtonStage_.appendChild(newSvg);

  attr.x = '26%';
  attr.y = '231px';
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('undo'));
  this.textButtonStage_.appendChild(newSvg);

  attr.x = '68%';
  var newSvg = Blockly.utils.createSvgElement('text', attr);
  newSvg.appendChild(document.createTextNode('reset'));
  this.textButtonStage_.appendChild(newSvg);

  // Fill in the appropriate buttons: 
  this.updateButtons(0, Blockly.FieldGANPaint.BRUSH_STATES.indexOf(this.brushState_));
  if (this.drawingState_ == 'draw') {
    this.updateButtons(8,7);
  }
  else {
    this.updateButtons(7,8);
  }


  // ------ Create the main image: ------
  this.mainImageStage_ = Blockly.utils.createSvgElement('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'xmlns:html': 'http://www.w3.org/1999/xhtml',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'version': '1.1',
    'height': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE + 'px',
    'width': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE + 'px'
  }, div);
  
  attr = {
    'x': '0px',
    'y': '0px',
    'width': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE,
    'height': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE,
    'href': this.mainImageAddress_
  }
  this.mainImage_ = Blockly.utils.createSvgElement('image', attr, this.mainImageStage_);
  this.mainImageWrapper_ = Blockly.bindEventWithChecks_(this.mainImage_, 'dragstart', this, this.onImageDrag);

  
  // ------ Create the church selection buttons: ------
  this.churchButtonStage_ = Blockly.utils.createSvgElement('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'xmlns:html': 'http://www.w3.org/1999/xhtml',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'version': '1.1',
    'height': Blockly.FieldGANPaint.MAIN_IMAGE_SIZE + 'px',
    'width': '118px'
  }, div);
  
  this.churchButtonLocations_ = [];

  var church_clip_path = Blockly.utils.createSvgElement('clipPath', {'id': 'rounded-rect', 'clipPathUnits': 'objectBoundingBox'});
  var adjusted_rx_val = Blockly.FieldGANPaint.BUTTON_RADIUS / Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE;
  attr = {
    'x': '0', 'y': '0',
    'width': '1',
    'height': '1',
    'rx': adjusted_rx_val.toString(),
    'ry': adjusted_rx_val.toString()
  };
  var newSvg = Blockly.utils.createSvgElement('rect', attr, church_clip_path);
  this.churchButtonStage_.appendChild(church_clip_path);

  for (let i = 0; i < 5; i++) {
    var y = 38 + i * (Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE + Blockly.FieldGANPaint.BUTTON_PAD);
    for (let j = 0; j < 3; j++){
      var x = 5 + j * (Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE + Blockly.FieldGANPaint.BUTTON_PAD);
      attr = {
        'x': x + 'px', 'y': y + 'px',
        'width': Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE,
        'height': Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE,
        'clip-path': 'url(#rounded-rect)',
        'href': Blockly.mainWorkspace.options.pathToMedia + 'extensions/ganpaint_images/church' + (3 * i + j) + '.jpg'    // Used to be: Blockly.FieldGANPaint.CHURCH_IMAGE_LOCATIONS[3 * i + j]
      };
      var church_button = Blockly.utils.createSvgElement('image', attr, this.churchButtonStage_);
      this.churchButtonLocations_.push([x, y]);
    }
  }

  attr = {
    'x': '5px', 
    'y': (38 + 5 * (Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE + Blockly.FieldGANPaint.BUTTON_PAD)) + 'px',
    'width': Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE,
    'height': Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE,
    'clip-path': 'url(#rounded-rect)',
    'href': Blockly.mainWorkspace.options.pathToMedia + 'extensions/ganpaint_images/church15.jpg'
  };
  var church_button = Blockly.utils.createSvgElement('image', attr, this.churchButtonStage_);
  this.churchButtonLocations_.push([5, (38 + 5 * (Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE + Blockly.FieldGANPaint.BUTTON_PAD))]);

  attr = {
    'x': '26', 'y': '15px',
    'text-decoration': 'underline',
    'fill': '#FFFFFF',
    'font-family': '"Helvetica Neue", Helvetica, sans-serif',
    'font-size': '13px',
    'font-weight': '500'
  };
  var newSvg = Blockly.utils.createSvgElement('text', attr); 
  newSvg.appendChild(document.createTextNode('Choose A'));
  this.churchButtonStage_.appendChild(newSvg);
  
  attr.x = '6';
  attr.y = '30';
  var newSvg = Blockly.utils.createSvgElement('text', attr); 
  newSvg.appendChild(document.createTextNode('Different Picture:'));
  this.churchButtonStage_.appendChild(newSvg);



  // ------ Other setup stuff: ------
  Blockly.DropDownDiv.setColour(this.sourceBlock_.getColour(),
      this.sourceBlock_.getColourTertiary());
  Blockly.DropDownDiv.setCategory(this.sourceBlock_.getCategory());
  Blockly.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_);

  // Bind the necessary events to the necessary functions: 
  this.mainImageTouchWrapper_ =
      Blockly.bindEvent_(this.mainImageStage_, 'mousedown', this, this.onMouseDown);
  this.textButtonClickWrapper_ =
      Blockly.bindEventWithChecks_(this.textButtonStage_, 'click', this, this.onButtonClick);
  this.churchButtonClickWrapper_ = 
      Blockly.bindEventWithChecks_(this.churchButtonStage_, 'click', this, this.onChurchButtonClick);
};

// Not sure what this does. 
this.nodeCallback_ = function(e, num) {
  console.log(num);
};

/**
 * Redraw the brush text buttons so that the appropriate ones are visibly selected. First 
 this function un-fills the element to un-fill, and then it fills the element to fill. 
 * @param {number} to_clear The index of the element in this.textButtons_ to un-fill. 
 * @param {number} to_fill The index of the element in this.textButtons_ to fill. 
 * @private
 */
Blockly.FieldGANPaint.prototype.updateButtons = function(to_clear, to_fill) {
  this.textButtons_[to_clear].removeAttribute('fill');
  this.textButtons_[to_fill].setAttribute('fill', '#085541');
};

/**
 * Redraw the main image and thumbnail with the image at this.mainImageAddress_. 
 * @private
 */
Blockly.FieldGANPaint.prototype.updateImage = function() {
  this.mainImage_.setAttribute('href', this.mainImageAddress_);
  this.thumbnailImage_.setAttribute('href', this.mainImageAddress_);
};

/**
 * Handles what happens when the main image experiences a mousedown event. 
 * @param {!Event} e A MouseEvent object. 
 */
Blockly.FieldGANPaint.prototype.onMouseDown = function(e) {
  var bBox = this.mainImageStage_.getBoundingClientRect();
  this.selectedPoints_ = [[Math.trunc(e.clientX - bBox.left), Math.trunc(e.clientY - bBox.top)]];

  if (!this.mainImageMoveWrapper_) {
    this.mainImageMoveWrapper_ = 
      Blockly.bindEvent_(document.body, 'mousemove', this, this.onMouseMove);
  }
  if (!this.mainImageReleaseWrapper_) {
    this.mainImageReleaseWrapper_ =
      Blockly.bindEvent_(document.body, 'mouseup', this, this.onMouseUp);
  }
};

/**
 * Handles what happens when a text button (i.e. a button on the left side of the GUI) is clicked. 
 * @param {!Event} e A MouseEvent object. 
*/
Blockly.FieldGANPaint.prototype.onButtonClick = function(e) {
  var bBox = this.textButtonStage_.getBoundingClientRect();
  var x = e.clientX - bBox.left;
  var y = e.clientY - bBox.top;
  for (let i = 0; i < 11; i++) {
    if (x >= this.textButtonLocations_[i][0] && x <= (this.textButtonLocations_[i][0] + this.textButtonLocations_[i][2]) &&
      y >= this.textButtonLocations_[i][1] && y <= (this.textButtonLocations_[i][1] + this.textButtonLocations_[i][3])) {
        if (i < 7) {                              // A brush button was clicked
          if (this.brushState_ != Blockly.FieldGANPaint.BRUSH_STATES[i]) {
            var oldButtonNumber = Blockly.FieldGANPaint.BRUSH_STATES.indexOf(this.brushState_);
            this.brushState_ = Blockly.FieldGANPaint.BRUSH_STATES[i];
            this.updateButtons(oldButtonNumber, i);
          }
        }
        else if (i == 7) {                        // The "draw" button was clicked
          this.drawingState_ = 'draw';
          this.updateButtons(8, 7);
        }
        else if (i == 8) {                        // The "remove" button was clicked
          this.drawingState_ = 'remove';
          this.updateButtons(7, 8);
        }
        else if (i == 9) {                        // The "undo" button was clicked
          console.log('"Undo" button clicked. ');   // All this does is display '"Undo" button clicked. ' in the console. 
          
          // ***
          // Undo button NOT YET IMPLEMENTED. Add the necessary code here. 
          // ***

        }
        else {                                    // The "reset" button was clicked
          console.log('"Reset" button clicked. ');  // All this does is display '"Reset" button clicked. ' in the console. 
          this.mainImageAddress_ = this.originalImageAddress_;
          this.updateImage();

          // ***
          // Delete the cache of undo images. NOT YET IMPLEMENTED. 
          // ***

        }
        break;
      }
  }
}

/**
 * Handles what happens when a church selection button is clicked. 
 * @param {!Event} e A MouseEvent object. 
*/
Blockly.FieldGANPaint.prototype.onChurchButtonClick = function(e) {
  var bBox = this.churchButtonStage_.getBoundingClientRect();
  var x = e.clientX - bBox.left;
  var y = e.clientY - bBox.top;
  for (let i = 0; i < 16; i++) {
    if (x >= this.churchButtonLocations_[i][0] && x <= (this.churchButtonLocations_[i][0] + Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE) &&
      y >= this.churchButtonLocations_[i][1] && y <= (this.churchButtonLocations_[i][1] + Blockly.FieldGANPaint.CHURCH_BUTTON_SIZE)) {
      this.originalImageAddress_ = Blockly.mainWorkspace.options.pathToMedia + 'extensions/ganpaint_images/church' + i + '.jpg';
      this.mainImageAddress_ = this.originalImageAddress_;
      this.updateImage();

      // ***
      // Delete the cache of undo images. NOT YET IMPLEMENTED. 
      // ***

      break;
      }
  }
}

/**
 * Unbind mousemove event. Called when main image stops being clicked. 
 */
Blockly.FieldGANPaint.prototype.onMouseUp = function() {
  Blockly.unbindEvent_(this.mainImageMoveWrapper_);
  Blockly.unbindEvent_(this.mainImageReleaseWrapper_);
  this.mainImageMoveWrapper_ = null;
  this.mainImageReleaseWrapper_ = null;

  console.log(this.selectedPoints_);    // All this does is display this.selectedPoints in the console. 

  // ***
  // Send this.selectedPoints, this.brushState, this.drawingState, and the main image to the GAN 
  // Paint server, and get the new main image back from the server. NOT YET IMPLEMENTED. 
  // ***

};

/**
 * Called as the mouse drags across the main image. Logs the coordinates of all points within the 
 main image that the mouse drags across, and stores them in the array this.selectedPoints. 
 * @param {!Event} e mousemove event.
 */
Blockly.FieldGANPaint.prototype.onMouseMove = function(e) {
  var bBox = this.mainImageStage_.getBoundingClientRect();
  var x = Math.trunc(e.clientX - bBox.left);
  var y = Math.trunc(e.clientY - bBox.top);
  if (x >= 0 && y >= 0 && x < Blockly.FieldGANPaint.MAIN_IMAGE_SIZE && y < Blockly.FieldGANPaint.MAIN_IMAGE_SIZE) {
    this.selectedPoints_.push([x, y]);
  }
};

/**
 * Prevent the main image from being dragged. 
 * @param {!Event} e dragstart event.
 */
Blockly.FieldGANPaint.prototype.onImageDrag = function(e) {
  e.preventDefault();
};

/**
 * Clean up this FieldGANPaint, as well as the inherited Field. 

  Note From Philip: I'm not sure under what circumstances this function gets called, nor do I know
  if it has ever been called while I have been working on this file. Therefore, it is not 
  impossible that I have introduced a bug in this function without ever noticing it. 

 * @return {!Function} Closure to call on destruction of the WidgetDiv. 
 * @private
 */
Blockly.FieldGANPaint.prototype.dispose_ = function() {
  var thisField = this;
  return function() {
    Blockly.FieldGANPaint.superClass_.dispose_.call(thisField)();
    thisField.matrixStage_ = null;
    if (thisField.mouseDownWrapper_) {
      Blockly.unbindEvent_(thisField.mouseDownWrapper_);
    }
    if (thisField.mainImageTouchWrapper_) {
      Blockly.unbindEvent_(thisField.mainImageTouchWrapper_);
    }
    if (thisField.mainImageReleaseWrapper_) {
      Blockly.unbindEvent_(thisField.mainImageReleaseWrapper_);
    }
    if (thisField.mainImageMoveWrapper_) {
      Blockly.unbindEvent_(thisField.mainImageMoveWrapper_);
    }
    if (thisField.textButtonClickWrapper_) {
      Blockly.unbindEvent_(thisField.textButtonClickWrapper_);
    }
    if (thisField.churchButtonClickWrapper_) {
      Blockly.unbindEvent_(thisField.churchButtonClickWrapper_);
    }
    if (thisField.mainImageWrapper_) {
      Blockly.unbindEvent_(thisField.mainImageWrapper_);
    }
  };
};

Blockly.Field.register('field_ganpaint', Blockly.FieldGANPaint);    // Part of the process of registering ganpaint as its own field type. 
