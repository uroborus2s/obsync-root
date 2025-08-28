#!/bin/bash

# 503错误诊断脚本
echo "=== 503错误诊断报告 ==="
echo "时间: $(date)"
echo

# 测试单个请求
echo "1. 单个请求测试:"
curl -s -w "HTTP状态: %{http_code} | 总时间: %{time_total}s | 连接时间: %{time_connect}s\n" \
  "https://kwps.jlufe.edu.cn/api/workflows/definitions?page=1&pageSize=1" \
  -H "Cookie: wps_jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDIwMzIiLCJ1c2VybmFtZSI6IuWtmeawuOmUkCIsInVzZXJOdW1iZXIiOiIzMDIwMzIiLCJ1c2VyVHlwZSI6InRlYWNoZXIiLCJjb2xsZWdlTmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInJvbGVzIjpbInRlYWNoZXIiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsInRlYWNoZXI6cHJvZmlsZSIsInRlYWNoZXI6Y291cnNlcyIsInRlYWNoZXI6c3R1ZGVudHMiXSwiZW1wbG95ZWVOdW1iZXIiOiIzMDIwMzIiLCJkZXBhcnRtZW50TmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInRpdGxlIjoi5bel56iL5biIIiwiZWR1Y2F0aW9uIjoi56GV5aOr56CU56m255SfIiwiaWF0IjoxNzU1NzY4MDg3LCJleHAiOjE3NTgyNzM2ODcsImF1ZCI6InN0cmF0aXgtYXBwIiwiaXNzIjoic3RyYXRpeC1nYXRld2F5In0.uGvdIW-dKtOHx_P-0a1Xlo_57Fcow7MubGHN4BkfYek.td6zdEamdRPcwqkGhoGX0jPO87MwDGOOpwG%2FFr9XmNc;wps_auth_expires=1758273693782.pyHzo%2BqvdWhFq9IUprzaxZs62eqEujgpv%2BDf7eB9ZuE" \
  -H "User-Agent: curl/7.68.0" \
  -o /dev/null

echo
echo "2. 连续5个请求测试:"
for i in {1..5}; do
  status=$(curl -s -w "%{http_code}" \
    "https://kwps.jlufe.edu.cn/api/workflows/definitions?page=1&pageSize=1" \
    -H "Cookie: wps_jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDIwMzIiLCJ1c2VybmFtZSI6IuWtmeawuOmUkCIsInVzZXJOdW1iZXIiOiIzMDIwMzIiLCJ1c2VyVHlwZSI6InRlYWNoZXIiLCJjb2xsZWdlTmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInJvbGVzIjpbInRlYWNoZXIiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsInRlYWNoZXI6cHJvZmlsZSIsInRlYWNoZXI6Y291cnNlcyIsInRlYWNoZXI6c3R1ZGVudHMiXSwiZW1wbG95ZWVOdW1iZXIiOiIzMDIwMzIiLCJkZXBhcnRtZW50TmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInRpdGxlIjoi5bel56iL5biIIiwiZWR1Y2F0aW9uIjoi56GV5aOr56CU56m255SfIiwiaWF0IjoxNzU1NzY4MDg3LCJleHAiOjE3NTgyNzM2ODcsImF1ZCI6InN0cmF0aXgtYXBwIiwiaXNzIjoic3RyYXRpeC1nYXRld2F5In0.uGvdIW-dKtOHx_P-0a1Xlo_57Fcow7MubGHN4BkfYek.td6zdEamdRPcwqkGhoGX0jPO87MwDGOOpwG%2FFr9XmNc;wps_auth_expires=1758273693782.pyHzo%2BqvdWhFq9IUprzaxZs62eqEujgpv%2BDf7eB9ZuE" \
    -H "User-Agent: curl/7.68.0" \
    -o /dev/null)
  echo "请求 $i: HTTP $status"
done

echo
echo "3. 获取一个503错误的详细信息:"
curl -v "https://kwps.jlufe.edu.cn/api/workflows/definitions?page=1&pageSize=1" \
  -H "Cookie: wps_jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDIwMzIiLCJ1c2VybmFtZSI6IuWtmeawuOmUkCIsInVzZXJOdW1iZXIiOiIzMDIwMzIiLCJ1c2VyVHlwZSI6InRlYWNoZXIiLCJjb2xsZWdlTmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInJvbGVzIjpbInRlYWNoZXIiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsInRlYWNoZXI6cHJvZmlsZSIsInRlYWNoZXI6Y291cnNlcyIsInRlYWNoZXI6c3R1ZGVudHMiXSwiZW1wbG95ZWVOdW1iZXIiOiIzMDIwMzIiLCJkZXBhcnRtZW50TmFtZSI6IuWunumqjOWunuiureS4reW_gyIsInRpdGxlIjoi5bel56iL5biIIiwiZWR1Y2F0aW9uIjoi56GV5aOr56CU56m255SfIiwiaWF0IjoxNzU1NzY4MDg3LCJleHAiOjE3NTgyNzM2ODcsImF1ZCI6InN0cmF0aXgtYXBwIiwiaXNzIjoic3RyYXRpeC1nYXRld2F5In0.uGvdIW-dKtOHx_P-0a1Xlo_57Fcow7MubGHN4BkfYek.td6zdEamdRPcwqkGhoGX0jPO87MwDGOOpwG%2FFr9XmNc;wps_auth_expires=1758273693782.pyHzo%2BqvdWhFq9IUprzaxZs62eqEujgpv%2BDf7eB9ZuE" \
  -H "User-Agent: hey/0.0.1" 2>&1 | head -30

echo
echo "=== 诊断完成 ==="