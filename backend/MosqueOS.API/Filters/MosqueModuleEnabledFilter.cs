using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequireMosqueModuleAttribute : TypeFilterAttribute
{
    public RequireMosqueModuleAttribute(string moduleKey)
        : base(typeof(MosqueModuleEnabledFilter))
    {
        Arguments = [moduleKey];
    }
}

public class MosqueModuleEnabledFilter : IAsyncActionFilter
{
    private readonly string _moduleKey;
    private readonly IUnitOfWork _unitOfWork;

    public MosqueModuleEnabledFilter(string moduleKey, IUnitOfWork unitOfWork)
    {
        _moduleKey = moduleKey;
        _unitOfWork = unitOfWork;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.ActionArguments.TryGetValue("mosqueId", out var idObj) || idObj is not int mosqueId)
        {
            await next();
            return;
        }

        var setting = await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking()
            .FirstOrDefaultAsync(s => s.MosqueId == mosqueId && s.ModuleKey == _moduleKey);

        // If no setting row exists, allow by default (module not explicitly disabled)
        if (setting != null && !setting.IsEnabled)
        {
            context.Result = new ObjectResult(new ApiMessageResponse
            {
                Message = $"Module '{_moduleKey}' is not enabled for this mosque."
            })
            {
                StatusCode = StatusCodes.Status404NotFound
            };
            return;
        }

        await next();
    }
}
