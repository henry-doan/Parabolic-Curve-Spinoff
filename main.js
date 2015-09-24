var CONTROL_POINT_SIZE = 16;
var MAX_RESOLUTION = 40;
var BACKGROUND = color(0, 0, 0);

var selectedPoint = false;
var fixedLength = false;
var sliders;

// Given the end points of two lines (x1, y1) to (x2, y2) and (x3, y3) to (x4, y4),
// return the point where they intersect
// Assume lines do intersect (i.e. are not parallel and are not segments)
var findIntersection = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    var dx1 = (x1 - x2);
    var dx2 = (x3 - x4);
    var dy1 = (y1 - y2);
    var dy2 = (y3 - y4);
    var d = dx1 * dy2 - dy1 * dx2;
    return [(dx2 * (x1 * y2 - y1 * x2) - dx1 * (x3 * y4 - y3 * x4)) / d,
            (dy2 * (x1 * y2 - y1 * x2) - dy1 * (x3 * y4 - y3 * x4)) / d];
};

/*********************************************************************
 * GUI Slider to vary parameters
**********************************************************************/

var Slider = function(x, y, width, min_v, max_v, current_v) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.min = min_v;
    this.max = max_v;
    this.scale = (max_v - min_v) / width;
    this.val = current_v || min_v;
    this.bx = this.x + (this.val - min_v) / this.scale;
    
    this.held = false;

    this.draw = function() {
        noStroke();
        fill(200);
        rect(this.x, this.y-1, this.width+2, 3, 4);
        
        strokeWeight(1);
        stroke(60);
        line(this.x + 1, this.y-1, x + this.width, this.y);
    
        fill(180);
        stroke(50);
        rect(this.bx, this.y-8, 10, 16, 3);
        
        for (var i=0; i<3; i++) {
            var y = this.y + i*3 - 3;
            stroke(50);
            line(this.bx + 3, y, this.bx + 7, y); 
            stroke(200);
            line(this.bx + 3, y+1, this.bx + 7, y+1); 
        }
    };
    
    this.selected = function() {
        this.held = mouseX > this.bx - 1 && mouseX < this.bx + 11 && 
                    mouseY > this.y - 9 && mouseY < this.y + 9;
    };
    
    this.drag = function() {
        if (this.held) {
            var x = constrain(mouseX, this.x, this.x + this.width);
            this.bx = x;
            this.val = this.min + round((x - this.x) * this.scale);
            return true;
        }
    };
  
    // This is used if you want to update the value in a way other
    // than using the slider (but want the slider to update).
    this.update = function(d) {
        this.val = constrain(this.val + d, this.min, this.max);
        this.bx = (this.val - this.min) / this.scale + this.x;
    };
};

/*********************************************************************
 * Control points are circles that can be dragged to change the curve
**********************************************************************/
var ControlPoint = function(x, y) {
    this.x = x;
    this.y = y;
    this.r = CONTROL_POINT_SIZE;
    
    this.mouseover = function() {
        return dist(mouseX, mouseY, this.x, this.y) <= this.r / 2;
    };
    
    this.draw = function() {
        noStroke();
        
        if (this.mouseover()) {
            strokeWeight(2);
            stroke(100, 100, 200);
            fill(240, 240, 240, 230);
        } else {
            noStroke();
            fill(160, 160, 200, 100);
        }
        
        ellipse(this.x, this.y, this.r, this.r);
    };
};

// Curve between by two points at (x1, y1) and (x2, y2),
// with a control point at (x3, y3)
var Curve = function(x1, y1, x2, y2, x3, y3) {
    this.p1 = new ControlPoint(x1, y1);
    this.p2 = new ControlPoint(x2, y2);
    this.p3 = new ControlPoint(x3, y3);
    this.controlPoints = [this.p1, this.p2, this.p3];
    this.splinePoints = [];
    
    this.update = function() {
        this.lengths = [
            dist(this.p1.x, this.p1.y, this.p3.x, this.p3.y),
            dist(this.p2.x, this.p2.y, this.p3.x, this.p3.y)
        ];
        var angle1 = atan2(this.p3.y - this.p1.y, this.p3.x - this.p1.x);
        var angle2 = atan2(this.p3.y - this.p2.y, this.p3.x - this.p2.x);
        this.c1 = cos(angle1);
        this.s1 = sin(angle1);
        this.c2 = cos(angle2);
        this.s2 = sin(angle2);
        
        // Fill splinePoints array with points along the curve
        var n = sliders[0].val;
        var x1 = this.p1.x;
        var y1 = this.p1.y;
        var x2 = this.p2.x + this.lengths[1] * n / (n + 1) * this.c2;
        var y2 = this.p2.y + this.lengths[1] * n / (n + 1) * this.s2;
        
        this.splinePoints = [[x1, y1]];
        for (var i = 1; i <= n; i++) {
            var len1 = this.lengths[0] * i / (n + 1);
            var len2 = this.lengths[1] * (n - i) / (n + 1);
            var x3 = this.p1.x + len1 * this.c1;
            var y3 = this.p1.y + len1 * this.s1;
            var x4 = this.p2.x + len2 * this.c2;
            var y4 = this.p2.y + len2 * this.s2;
            var coord = findIntersection(x1, y1, x2, y2, x3, y3, x4, y4);
            x1 = coord[0];
            y1 = coord[1];
            x2 = x4;
            y2 = y4;
            this.splinePoints.push([x1, y1]);
        }
        this.splinePoints.push([x2, y2]);
    };
    this.update();
    
    this.draw = function() {
        // Construction lines
        strokeWeight(1);
        stroke(255, 50, 255);
        var n = sliders[0].val;
        for (var i = 0; i <= n; i++) {
            var len1 = this.lengths[0] * i / (n + 1);
            var len2 = this.lengths[1] * (n - i) / (n + 1);
            var x1 = this.p1.x + len1 * this.c1;
            var y1 = this.p1.y + len1 * this.s1;
            var x2 = this.p2.x + len2 * this.c2;
            var y2 = this.p2.y + len2 * this.s2;
            line(x1, y1, x2, y2);
        }
        
        // Parabola
        strokeWeight(2);
        stroke(255, 255, 255);
        var x1 = this.splinePoints[0][0];
        var y1 = this.splinePoints[0][1];
        for (var i = 0; i <= this.splinePoints.length - 1; i++) {
            var x2 = this.splinePoints[i][0];
            var y2 = this.splinePoints[i][1];
            line(x1, y1, x2, y2);
            x1 = x2;
            y1 = y2;
        }
        
        // Lines to control points
        strokeWeight(2);
        stroke(115, 60, 150);
        line(this.p1.x, this.p1.y, this.p3.x, this.p3.y);
        line(this.p2.x, this.p2.y, this.p3.x, this.p3.y);
        
        for (var i = 0; i < this.controlPoints.length; i++) {
            this.controlPoints[i].draw();
        }
    };
    
    this.selectPoint = function() {
        for (var i = 0; i < this.controlPoints.length; i++) {
            if (this.controlPoints[i].mouseover()) {
                selectedPoint = i;
            }
        }
    };
    
    this.mouseDrag = function() {
        if (selectedPoint !== false) {
            var p = this.controlPoints[selectedPoint];
            if (fixedLength && selectedPoint < 2) {
                var angle = atan2(mouseY - this.p3.y, mouseX - this.p3.x);
                p.x = this.p3.x + this.lengths[selectedPoint] * cos(angle);
                p.y = this.p3.y + this.lengths[selectedPoint] * sin(angle);
            } else {
                p.x += mouseX - pmouseX;
                p.y += mouseY - pmouseY;   
            }
            this.update();
        }
    };
};

sliders = [new Slider(96, 12, 120, 0, MAX_RESOLUTION, 1)];
var myCurve = new Curve(100, 150, width-100, 150, width/2, 320);

var drawGUI = function() {
    noStroke();
    fill(0, 0, 0, 200);
    rect(2, 2, 396, 24);
    textAlign(LEFT, CENTER);
    fill(250);
    text("Resolution: " + sliders[0].val, 5, sliders[0].y);
    
    for (var s = 0; s < sliders.length; s++) {
        sliders[s].draw();   
    }
};

var draw = function() {
    background(BACKGROUND);
    myCurve.draw();
    drawGUI();
};

var mousePressed = function() {
    myCurve.selectPoint();
    for (var s = 0; s < sliders.length; s++) {
        sliders[s].selected();
    }
};

var mouseReleased = function() {
    selectedPoint = false;
    for (var s = 0; s < sliders.length; s++) {
        sliders[s].held = false;
    }
};

var mouseDragged = function() {
    myCurve.mouseDrag();
    for (var s = 0; s < sliders.length; s++) {
        if(sliders[s].drag()) {
            myCurve.update();
        }
    }
};