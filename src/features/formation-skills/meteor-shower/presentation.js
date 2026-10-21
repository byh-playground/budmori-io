import { MeteorPresentation } from '../meteor/presentation.js';
export class MeteorShowerPresentation extends MeteorPresentation {
    constructor() {
        super();
        this.bodySize = 0.6;
        this.tailWidth = 0.8;
    }
}
