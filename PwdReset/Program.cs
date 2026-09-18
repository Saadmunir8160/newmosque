using Microsoft.AspNetCore.Identity;
using System;

namespace PasswordResetter
{
    class DummyUser {}
    
    class Program
    {
        static void Main(string[] args)
        {
            var user = new DummyUser();
            var hasher = new PasswordHasher<DummyUser>();
            var hash = hasher.HashPassword(user, "Member@123");
            Console.WriteLine("NEW_HASH:" + hash);
        }
    }
}
