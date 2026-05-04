import {
  useGetDashboardSummary,
  useGetPipelineSummary,
  useGetSourceBreakdown,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CheckCircle, Briefcase, TrendingUp, AlertCircle, DollarSign, Activity as ActivityIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { CONTACT_STATUS_LABELS, CONTACT_SOURCE_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isPipelineLoading } = useGetPipelineSummary();
  const { data: sourceBreakdown, isLoading: isSourceLoading } = useGetSourceBreakdown();
  const { data: recentActivity, isLoading: isActivityLoading } = useGetRecentActivity({ limit: 10 });

  const pieData = sourceBreakdown?.map(item => ({
    name: CONTACT_SOURCE_LABELS[item.source] || item.source,
    value: item.count
  })) || [];

  const barData = pipeline?.map(item => ({
    name: CONTACT_STATUS_LABELS[item.status] || item.status,
    count: item.count,
    revenue: item.revenue
  })) || [];

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={summary?.totalLeads}
          icon={Users}
          isLoading={isSummaryLoading}
        />
        <MetricCard
          title="Booked Jobs"
          value={summary?.bookedJobs}
          icon={Briefcase}
          isLoading={isSummaryLoading}
        />
        <MetricCard
          title="Completed Jobs"
          value={summary?.completedJobs}
          icon={CheckCircle}
          isLoading={isSummaryLoading}
        />
        <MetricCard
          title="Total Revenue"
          value={summary?.totalRevenue ? `$${summary.totalRevenue.toLocaleString()}` : "$0"}
          icon={DollarSign}
          isLoading={isSummaryLoading}
        />
        <MetricCard
          title="Conversion Rate"
          value={summary?.conversionRate ? `${summary.conversionRate.toFixed(1)}%` : "0%"}
          icon={TrendingUp}
          isLoading={isSummaryLoading}
        />
        <MetricCard
          title="Lost Leads"
          value={summary?.lostLeads}
          icon={AlertCircle}
          isLoading={isSummaryLoading}
          className="text-destructive"
        />
        <MetricCard
          title="Overdue Follow-ups"
          value={summary?.overdueFollowUps}
          icon={AlertCircle}
          isLoading={isSummaryLoading}
          className={summary?.overdueFollowUps ? "text-destructive" : ""}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="glass rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
            <CardDescription>Number of contacts per stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] md:h-[300px]">
            {isPipelineLoading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </div>

        <div className="glass rounded-2xl">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads come from</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] md:h-[300px]">
            {isSourceLoading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across your CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {isActivityLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {recentActivity?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="mt-0.5 bg-primary/10 p-2 rounded-full h-fit">
                        <ActivityIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <span className="font-semibold">{activity.contactName}</span>{" "}
                          {activity.action}
                        </p>
                        {activity.details && (
                          <p className="text-sm text-muted-foreground">{activity.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, isLoading, className = "" }: any) {
  return (
    <div className="glass rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs md:text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className={`h-4 w-4 text-muted-foreground ${className}`} />
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className={`text-xl md:text-2xl font-bold ${className}`}>{value !== undefined ? value : "-"}</div>
      )}
    </div>
  );
}