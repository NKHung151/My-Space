export interface DashboardPoint {
  date: string;
  count: number;
}

export interface DashboardArticle {
  id: string;
  title: string;
  viewCount: number;
}

export interface AdminDashboardOverview {
  summary: {
    totalUsers: number;
    totalArticles: number;
    totalComments: number;
    totalLikes: number;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    growth: DashboardPoint[];
  };
  posts: {
    total: number;
    totalViews: number;
    topArticles: DashboardArticle[];
  };
  social: {
    comments: number;
    postLikes: number;
    commentLikes: number;
    totalLikes: number;
  };
}
