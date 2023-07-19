import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Node, Edge } from '@swimlane/ngx-graph';

@Component({
  selector: 'app-dag',
  templateUrl: './dag.component.html',
  styleUrls: ['./dag.component.scss'],
})
export class DagComponent {
  @Input() layout: GraphLayout = 'dagre';
  @Input() links: Edge[] = [];
  @Input() nodes: Node[] = [];
  @Input() draggingEnabled = false;
  @Input() panningEnabled = false;
  @Input() autoCenter = true;
  @Input() autoZoom = true;
  @Output() nodeClicked = new EventEmitter<Node>();
}

type GraphLayout =
  | 'dagre'
  | 'dagreCluster'
  | 'd3ForceDirected'
  | 'colaForceDirected';
