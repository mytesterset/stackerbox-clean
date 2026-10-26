export interface Point {
	x: number;
	y: number;
}

export function getShapeLocalPoints(shape: string, halfLen: number, halfW: number): Point[] {
	switch (shape) {
		case 'ellipse': {
			const pts: Point[] = [];
			const segments = 20;
			for (let i = 0; i < segments; i++) {
				const t = (i / segments) * Math.PI * 2;
				pts.push({ x: Math.cos(t) * halfLen, y: Math.sin(t) * halfW });
			}
			return pts;
		}
		case 'chevron':
			return [
				{ x: -halfLen, y: -halfW },
				{ x: halfLen * 0.35, y: -halfW },
				{ x: halfLen, y: 0 },
				{ x: halfLen * 0.35, y: halfW },
				{ x: -halfLen, y: halfW },
				{ x: -halfLen * 0.55, y: 0 }
			];
		case 'hexagon':
			return [
				{ x: -halfLen, y: 0 },
				{ x: -halfLen * 0.5, y: -halfW },
				{ x: halfLen * 0.5, y: -halfW },
				{ x: halfLen, y: 0 },
				{ x: halfLen * 0.5, y: halfW },
				{ x: -halfLen * 0.5, y: halfW }
			];
		case 'rect':
		default:
			return [
				{ x: -halfLen, y: -halfW },
				{ x: halfLen, y: -halfW },
				{ x: halfLen, y: halfW },
				{ x: -halfLen, y: halfW }
			];
	}
}
