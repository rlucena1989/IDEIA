export interface RoadmapItem {
  itemId: string;
  title: string;
  description: string;
  priority: number;
  effort: 'small' | 'medium' | 'large';
  risk: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  value: 'low' | 'medium' | 'high' | 'critical';
}

export interface Roadmap {
  roadmapId: string;
  createdAt: string;
  targetId: string;
  items: RoadmapItem[];
}
