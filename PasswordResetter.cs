using Microsoft.AspNetCore.Identity;
using MosqueOS.Domain.Entities;
using System;

namespace PasswordResetter
{
    class Program
    {
        static void Main(string[] args)
        {
            var user = new ApplicationUser { Email = "member@mosqueos.uk", UserName = "member" };
            var hasher = new PasswordHasher<ApplicationUser>();
            var hash = hasher.HashPassword(user, "Member@123");
            Console.WriteLine("NEW_HASH:" + hash);
        }
    }
}
