import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api-client';
import { authManager } from '../lib/auth-manager';
export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('正在处理授权...');
    useEffect(() => {
        handleAuthCallback();
    }, []);
    const handleAuthCallback = async () => {
        try {
            const code = searchParams.get('code');
            const error = searchParams.get('error');
            // 检查是否有错误
            if (error) {
                throw new Error(`授权失败: ${error}`);
            }
            // 检查是否有授权码
            if (!code) {
                throw new Error('未收到授权码');
            }
            setMessage('正在获取访问令牌...');
            // 使用授权码获取token
            const tokens = await authManager.handleAuthCallback(code);
            setMessage('正在验证用户信息...');
            // 调用后端授权接口，设置cookie
            try {
                await api.post('/auth/wps-callback', {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expires_in: tokens.expiresIn
                });
            }
            catch (apiError) {
                console.warn('后端授权接口调用失败，但前端token已保存:', apiError);
            }
            setStatus('success');
            setMessage('授权成功，正在跳转...');
            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
                // 获取保存的重定向URL
                const redirectUrl = sessionStorage.getItem('auth_redirect_url');
                sessionStorage.removeItem('auth_redirect_url');
                if (redirectUrl && redirectUrl !== window.location.href) {
                    // 跳转到原来的页面
                    window.location.href = redirectUrl;
                }
                else {
                    // 跳转到首页
                    navigate('/', { replace: true });
                }
            }, 1500);
        }
        catch (error) {
            console.error('授权回调处理失败:', error);
            setStatus('error');
            setMessage(error instanceof Error ? error.message : '授权处理失败');
            // 3秒后跳转到首页
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 3000);
        }
    };
    return (<div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-md'>
        <div className='text-center'>
          {status === 'loading' && (<div className='flex flex-col items-center space-y-4'>
              <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
              <h2 className='text-xl font-semibold text-gray-900'>处理授权</h2>
              <p className='text-gray-600'>{message}</p>
            </div>)}

          {status === 'success' && (<div className='flex flex-col items-center space-y-4'>
              <div className='rounded-full bg-green-100 p-3'>
                <svg className='h-8 w-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7'/>
                </svg>
              </div>
              <h2 className='text-xl font-semibold text-gray-900'>授权成功</h2>
              <p className='text-gray-600'>{message}</p>
            </div>)}

          {status === 'error' && (<div className='flex flex-col items-center space-y-4'>
              <div className='rounded-full bg-red-100 p-3'>
                <svg className='h-8 w-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12'/>
                </svg>
              </div>
              <h2 className='text-xl font-semibold text-gray-900'>授权失败</h2>
              <p className='text-gray-600'>{message}</p>
              <p className='text-sm text-gray-500'>3秒后自动跳转到首页</p>
            </div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=AuthCallback.js.map