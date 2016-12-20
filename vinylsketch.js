(function () {
  const defaultConfig = {
    backgroundColor: 'white',
    lineColor: 'black',
    turns: 64,
    segmentsPerTurn: 3600
  };

  class VinylSketch {
    constructor(canvas, image = null) {
      Object.assign(this, defaultConfig, {canvas, image});
    }

    get length() {
      return Math.min(this.canvas.width, this.canvas.height);
    }
    get gap() {
      return this.length/2/this.turns;
    }
    set gap(value) {
      this.turns = this.length/2/value;
    }
    get anglePerSegment() {
      return 360/this.segmentsPerTurn;
    }
    get radiusPerSegment() {
      return this.gap / this.segmentsPerTurn;
    }
    
    toFrequency(b, p) {
      return 500 * (p.radius / 500);
    }
    toAmplitude(b, p) {
      return (1-b) * this.gap / 3;
    }
    
    brightnessInImage(ctx, p) {
      return ctx.getImageData(p.x, p.y, 1, 1).data[0]/255;
    }

    angleToPolar(alpha) {
      return {
        radius: alpha / 360 * this.segmentsPerTurn * this.radiusPerSegment,
        angle: (alpha % 360)/ 360 * 2 * Math.PI
      };
    }

    polarToCartesian(polar) {
      return {
        x: this.length/2 + Math.cos(polar.angle)*polar.radius,
        y: this.length/2 + Math.sin(polar.angle)*polar.radius
      };
    }

    draw() {
      const ctx = this.canvas.getContext('2d');
      const srcCtx = this.image.getContext('2d');
      ctx.fillStyle = this.backgroundColor;
      ctx.strokeStyle = this.lineColor;
      ctx.fillRect(0, 0, this.length, this.length);
      ctx.moveTo(this.length/2, this.length/2);

      for(let angle = 0; angle < (this.turns * 360); angle += this.anglePerSegment) {
        let polar = this.angleToPolar(angle);
        let cartesian = this.polarToCartesian(polar);
      
        const brightness = this.brightnessInImage(srcCtx, cartesian);
        polar.radius += Math.sin(polar.angle * this.toFrequency(brightness, polar)) * this.toAmplitude(brightness, polar);
        cartesian = this.polarToCartesian(polar);
        ctx.lineTo(cartesian.x, cartesian.y);
      }

      ctx.stroke();
    }
  }

  const vs = new VinylSketch(document.querySelector('.vinylsketch'));
  document.querySelector('input[type=file]').addEventListener('change', evt => {
    const file = evt.target.files[0];
    readFile(file)
      .then(toCanvas)
      .then(canvas => {
        vs.image = canvas;
        vs.draw();
     });
  });

  function readFile(file) {
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.addEventListener('load', function () {
        resolve(this.result);
      });
      fr.readAsDataURL(file);
    });
  }

  function toCanvas(dataurl) {
    return new Promise(resolve => {
      const img = new Image();
      img.src = dataurl;
      
      const c = document.createElement('canvas');
      c.width = vs.length;
      c.height = vs.length;
      c.getContext('2d').drawImage(img, 0, 0, img.width, img.height, 0, 0, vs.length, vs.length);
      resolve(c);
    });
  }
})();