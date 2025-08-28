#!/bin/bash

# 强制触发503错误的脚本
echo "=== 并发请求测试，强制触发503错误 ==="

# 创建10个并发请求，每个请求间隔极短
for i in {1..10}; do
  (
    response=$(curl -s -w "\nSTATUS:%{http_code}|TIME:%{time_total}|SIZE:%{size_download}" \
      "https://kwps.jlufe.edu.cn/api/workflows/definitions?page=1&pageSize=1" \
      -H "Cookie: wps_jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDIwMzIiLCJ1c2VybmFtZSI6IuWtmeawuOmUkCIsInVzZXJOdW1iZXIiOiIzMDIwMzIiLCJ1c2VyVHlwZSI6InRlYWNoZXIiLCJjb2xsZWdlTmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInJvbGVzIjpbInRlYWNoZXIiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsInRlYWNoZXI6cHJvZmlsZSIsInRlYWNoZXI6Y291cnNlcyIsInRlYWNoZXI6c3R1ZGVudHMiXSwiZW1wbG95ZWVOdW1iZXIiOiIzMDIwMzIiLCJkZXBhcnRtZW50TmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInRpdGxlIjoi5bel56iL5biIIiwiZWR1Y2F0aW9uIjoi56GV5aOr56CU56m255SfIiwiaWF0IjoxNzU1NzY4MDg3LCJleHAiOjE3NTgyNzM2ODcsImF1ZCI6InN0cmF0aXgtYXBwIiwiaXNzIjoic3RyYXRpeC1nYXRld2F5In0.uGvdIW-dKtOHx_P-0a1Xlo_57Fcow7MubGHN4BkfYek.td6zdEamdRPcwqkGhoGX0jPO87MwDGOOpwG%2FFr9XmNc;wps_auth_expires=1758273693782.pyHzo%2BqvdWhFq9IUprzaxZs62eqEujgpv%2BDf7eB9ZuE" \
      -H "User-Agent: hey/0.0.1")
      
    status_line=$(echo "$response" | tail -1)
    body_content=$(echo "$response" | head -n -1)
    
    echo "请求 $i: $status_line"
    
    # 如果是503错误，显示响应体内容
    if echo "$status_line" | grep -q "STATUS:503"; then
      echo "503错误详情: $body_content" | head -c 200
      echo "..."
    fi
  ) &
done

# 等待所有后台任务完成
wait

echo "=== 并发测试完成 ==="